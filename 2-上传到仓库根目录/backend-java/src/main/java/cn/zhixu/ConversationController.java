package cn.zhixu;

import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Private, account-owned conversation trees. Coordinates never determine ancestry. */
@RestController
@RequestMapping("/api/v1/ai/conversations")
class ConversationController {
    final Gateway gateway;
    final AssistantController assistant;
    final Quota quota;
    final JdbcTemplate db;
    ConversationController(Gateway gateway, AssistantController assistant, Quota quota, JdbcTemplate db) {
        this.gateway=gateway;this.assistant=assistant;this.quota=quota;this.db=db;
    }
    record Open(UUID id,UUID documentId,String sourcePath,String excerpt) {}
    record Read(UUID id) {}
    record Send(UUID id,UUID requestId,UUID parentId,String question,String mode) {}
    record Position(UUID id,double x,double y) {}
    record Layout(UUID id,long revision,List<Position> positions) {}
    record Conversation(String id,String title,String documentId,String sourcePath,String excerpt,long createdAt,long updatedAt,long revision) {}
    record Turn(String id,String parentId,String question,String mode,String state,String answer,long createdAt,Double x,Double y) {}

    Conversation owned(UUID user,UUID id) {
        if(id==null) throw new ApiError(400,"请选择一个对话");
        var rows=db.query("SELECT * FROM ai_conversations WHERE id=? AND user_id=?",(r,n)->new Conversation(r.getString("id"),r.getString("title"),r.getString("document_id"),r.getString("source_path"),r.getString("excerpt"),r.getLong("created_at"),r.getLong("updated_at"),r.getLong("revision")),id.toString(),user.toString());
        if(rows.isEmpty()) throw new ApiError(404,"对话不存在或不属于当前账号");
        return rows.getFirst();
    }
    List<Turn> turns(UUID id) {
        return db.query("SELECT * FROM ai_turns WHERE conversation_id=? ORDER BY created_at,id",(r,n)->new Turn(r.getString("id"),r.getString("parent_id"),r.getString("question"),r.getString("mode"),r.getString("state"),r.getString("answer"),r.getLong("created_at"),(Double)r.getObject("pos_x"),(Double)r.getObject("pos_y")),id.toString());
    }
    Map<String,Object> snapshot(UUID user,UUID id) {
        return Map.of("conversation",owned(user,id),"turns",turns(id),"remaining",quota.remaining(user));
    }
    @GetMapping Map<String,Object> list(@RequestHeader(value="Authorization",required=false) String token) {
        UUID user=gateway.user(token);
        var rows=db.query("SELECT id,title,excerpt,updated_at FROM ai_conversations WHERE user_id=? ORDER BY updated_at DESC LIMIT 200",(r,n)->Map.of("id",r.getString("id"),"title",r.getString("title"),"preview",r.getString("excerpt").substring(0,Math.min(60,r.getString("excerpt").length())),"updatedAt",r.getLong("updated_at")),user.toString());
        return Map.of("conversations",rows,"remaining",quota.remaining(user));
    }
    @PostMapping("/read") Map<String,Object> read(@RequestHeader(value="Authorization",required=false) String token,@RequestBody Read input) {
        return snapshot(gateway.user(token),input.id);
    }
    @PostMapping("/open") Map<String,Object> open(@RequestHeader(value="Authorization",required=false) String token,@RequestBody Open input) {
        UUID user=gateway.user(token);
        if(input.id==null) throw new ApiError(400,"缺少对话编号");
        String title=assistant.validateSource(token,input.documentId,input.sourcePath,input.excerpt);
        quota.transactions.execute(status->{
            // Same lock as quota reservations: bounds account storage across instances.
            db.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) c->{
                if(c.getMetaData().getDatabaseProductName().equals("PostgreSQL"))try(var s=c.prepareStatement("SELECT pg_advisory_xact_lock(20481114)")){s.execute();}return null;
            });
            if(db.queryForObject("SELECT COUNT(*) FROM ai_conversations WHERE id=?",Integer.class,input.id.toString())>0) {
                var old=owned(user,input.id);
                if(!Objects.equals(old.documentId,input.documentId==null?null:input.documentId.toString())||!Objects.equals(old.sourcePath,input.sourcePath)||!old.excerpt.equals(input.excerpt))throw new ApiError(409,"对话编号已用于另一段资料");
            } else {
                if(db.queryForObject("SELECT COUNT(*) FROM ai_conversations WHERE user_id=?",Integer.class,user.toString())>=200)throw new ApiError(409,"当前账号已达到 200 个学习对话上限");
                long now=System.currentTimeMillis();
                db.update("INSERT INTO ai_conversations(id,user_id,title,document_id,source_path,excerpt,created_at,updated_at,revision) VALUES(?,?,?,?,?,?,?,?,0)",input.id.toString(),user.toString(),title.substring(0,Math.min(300,title.length())),input.documentId==null?null:input.documentId.toString(),input.sourcePath,input.excerpt,now,now);
            }return null;
        });
        return snapshot(user,input.id);
    }
    /** Only this parent chain is sent, newest four complete turns, at most 20k chars. */
    static List<Map<String,String>> context(List<Turn> turns,String parent) {
        var index=new HashMap<String,Turn>();turns.forEach(t->index.put(t.id,t));
        var chain=new ArrayList<Turn>();var seen=new HashSet<String>();
        int chars=0;
        while(parent!=null && chain.size()<4) {
            var t=index.get(parent);
            if(t==null||!"done".equals(t.state)||!seen.add(parent))throw new ApiError(400,"只能从当前对话中已完成的回答继续追问");
            int length=Math.min(4500,t.answer.length());
            if(chars+length+t.question.length()>20000)break;
            chain.add(t);chars+=length+t.question.length();parent=t.parentId;
        }
        Collections.reverse(chain);var messages=new ArrayList<Map<String,String>>();
        for(var t:chain){messages.add(Map.of("role","user","content",t.question));messages.add(Map.of("role","assistant","content",t.answer.substring(0,Math.min(4500,t.answer.length()))+(t.answer.length()>4500?"\n[这条历史回答已截短]":"")));}
        return messages;
    }
    @PostMapping("/send") Map<String,Object> send(@RequestHeader(value="Authorization",required=false) String token,@RequestBody Send input) throws Exception {
        UUID user=gateway.user(token);var chat=owned(user,input.id);
        if(input.requestId==null||input.question==null||input.question.isBlank()||input.question.length()>300||input.mode==null||!Set.of("plain","example","steps").contains(input.mode))throw new ApiError(400,"问题需要 1–300 字，并选择讲解方式");
        // Re-check permission and source integrity on each new model request.
        assistant.validateSource(token,chat.documentId==null?null:UUID.fromString(chat.documentId),chat.sourcePath,chat.excerpt);
        if(!gateway.configured())throw new ApiError(503,"AI 尚未配置，请管理员连接模型服务");
        String signature=String.join("\n","conversation-v1",chat.id,String.valueOf(input.parentId),input.question,input.mode);
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(signature.getBytes(StandardCharsets.UTF_8)));
        var history=context(turns(input.id),input.parentId==null?null:input.parentId.toString());
        String cached=quota.transactions.execute(status->{
            // Lock the tree only while reserving, never during a model call.
            db.queryForList("SELECT id FROM ai_conversations WHERE id=? AND user_id=? FOR UPDATE",chat.id,user.toString());
            var existing=turns(input.id).stream().filter(t->t.id.equals(input.requestId.toString())).findFirst();
            if(existing.isEmpty() && db.queryForObject("SELECT COUNT(*) FROM ai_turns WHERE conversation_id=?",Integer.class,chat.id)>=100)throw new ApiError(409,"这张地图已达到 100 轮，请从笔记开启新的对话");
            String answer=quota.reserve(user,input.requestId,hash);
            if(existing.isEmpty())db.update("INSERT INTO ai_turns(id,conversation_id,parent_id,question,mode,state,created_at) VALUES(?,?,?,?,?,'running',?)",input.requestId.toString(),chat.id,input.parentId==null?null:input.parentId.toString(),input.question,input.mode,System.currentTimeMillis());
            return answer;
        });
        String answer=cached;
        if(answer==null) {
            try {answer=gateway.explain(chat.excerpt,input.question,input.mode,history);quota.finish(input.requestId,answer);}
            catch(RuntimeException e){quota.finish(input.requestId,null);db.update("UPDATE ai_turns SET state='failed' WHERE id=? AND conversation_id=?",input.requestId.toString(),chat.id);throw e;}
        }
        db.update("UPDATE ai_turns SET state='done',answer=? WHERE id=? AND conversation_id=?",answer,input.requestId.toString(),chat.id);
        db.update("UPDATE ai_conversations SET updated_at=? WHERE id=?",System.currentTimeMillis(),chat.id);
        return snapshot(user,input.id);
    }
    @PostMapping("/layout") Map<String,Object> layout(@RequestHeader(value="Authorization",required=false) String token,@RequestBody Layout input) {
        UUID user=gateway.user(token);owned(user,input.id);
        if(input.positions==null||input.positions.size()>100)throw new ApiError(400,"布局格式不正确");
        for(var p:input.positions)if(p.id==null||!Double.isFinite(p.x)||!Double.isFinite(p.y)||Math.abs(p.x)>50000||Math.abs(p.y)>50000)throw new ApiError(400,"卡片位置超出范围");
        quota.transactions.execute(status->{
            if(db.update("UPDATE ai_conversations SET revision=revision+1 WHERE id=? AND user_id=? AND revision=?",input.id.toString(),user.toString(),input.revision)!=1)throw new ApiError(409,"其他页面更新了布局，请刷新地图后再移动");
            for(var p:input.positions)if(db.update("UPDATE ai_turns SET pos_x=?,pos_y=? WHERE id=? AND conversation_id=?",p.x,p.y,p.id.toString(),input.id.toString())!=1)throw new ApiError(400,"卡片不属于当前对话");
            return null;
        });
        return Map.of("revision",input.revision+1);
    }
}
