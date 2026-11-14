package cn.zhixu;

import com.fasterxml.jackson.databind.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
class AssistantController {
    final Gateway gateway;
    final Quota quota;
    final Map<String,List<JsonNode>> sources=new HashMap<>();
    AssistantController(Gateway gateway,Quota quota,ObjectMapper json) throws Exception {
        this.gateway=gateway;this.quota=quota;
        try(var stream=new ClassPathResource("library-search-index.json").getInputStream()) {
            for(var section:json.readTree(stream).path("sections")) sources.computeIfAbsent(section.path("url").asText().split("#")[0], k->new ArrayList<>()).add(section);
        }
    }
    record Input(UUID requestId,UUID documentId,String sourcePath,String excerpt,String question,String mode) {}
    @GetMapping("/health") Map<String,Object> health() { return Map.of("status","ok","aiConfigured",gateway.configured()); }
    @GetMapping("/ai/quota") Map<String,Integer> quota(@RequestHeader(value="Authorization",required=false) String token) {
        return Map.of("remaining",quota.remaining(gateway.user(token)));
    }
    static String normalized(String s) { return s.replaceAll("\\s+","").replace("\u00a0",""); }
    String validateSource(String token, UUID documentId, String sourcePath, String excerpt) {
        if(excerpt==null || excerpt.isBlank() || excerpt.length()<5 || excerpt.length()>5000) throw new ApiError(400,"请选择 5–5000 字的笔记段落");
        if((documentId==null)==(sourcePath==null)) throw new ApiError(400,"请选择一篇有效笔记");
        String title,content;
        if(documentId!=null) {
            var result=gateway.request(gateway.supabase+"/rest/v1/zhixu_documents?id=eq."+documentId+"&select=title,plain_text,status",token.substring(7),null,true);
            if(!result.isArray() || result.isEmpty() || result.get(0).path("status").asText().equals("archived")) throw new ApiError(404,"资料不存在或没有阅读权限");
            title=result.get(0).path("title").asText();content=result.get(0).path("plain_text").asText();
        } else {
            var parts=sources.get(sourcePath);
            if(parts==null) throw new ApiError(404,"这篇笔记尚未加入 AI 资料目录");
            title=parts.getFirst().path("title").asText();
            content=parts.stream().map(p->p.path("text").asText()).reduce("",(a,b)->a+"\n"+b);
        }
        if(!normalized(content).contains(normalized(excerpt))) throw new ApiError(400,"所选内容与资料不一致，请重新选择正文中的一小段");
        return title;
    }
    @PostMapping("/ai/explain") Map<String,Object> explain(@RequestHeader(value="Authorization",required=false) String token,@RequestBody Input input) throws Exception {
        UUID user=gateway.user(token);
        if(input.requestId==null || input.excerpt==null || input.excerpt.length()<5 || input.excerpt.length()>5000 || (input.question!=null && input.question.length()>300) || !Set.of("plain","example","steps").contains(input.mode==null?"":input.mode)) throw new ApiError(400,"请选择 5–5000 字的段落，问题最多 300 字");
        String title=validateSource(token,input.documentId,input.sourcePath,input.excerpt);
        if(!gateway.configured()) throw new ApiError(503,"AI 尚未配置，请管理员连接模型服务");
        String signature=String.join("\n",String.valueOf(input.documentId),String.valueOf(input.sourcePath),input.excerpt,String.valueOf(input.question),input.mode);
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(signature.getBytes(StandardCharsets.UTF_8)));
        String answer=quota.reserve(user,input.requestId,hash);
        if(answer==null) {
            try { answer=gateway.explain(input.excerpt,input.question==null?"":input.question,input.mode);quota.finish(input.requestId,answer); }
            catch(RuntimeException e) { quota.finish(input.requestId,null);throw e; }
        }
        return Map.of("requestId",input.requestId,"explanation",answer,"sourceTitle",title,"remaining",quota.remaining(user));
    }
}
