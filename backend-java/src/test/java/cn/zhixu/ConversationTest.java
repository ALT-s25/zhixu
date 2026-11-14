package cn.zhixu;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:chat;DB_CLOSE_DELAY=-1","zhixu.daily-limit=20"})
@AutoConfigureMockMvc
class ConversationTest {
    @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired JdbcTemplate db;
    @Autowired AssistantController source; @MockitoBean Gateway gateway;
    UUID user=UUID.randomUUID();
    @BeforeEach void setup(){
        db.update("DELETE FROM ai_turns");db.update("DELETE FROM ai_conversations");db.update("DELETE FROM ai_calls");
        when(gateway.user("Bearer a")).thenReturn(user);
        when(gateway.user("Bearer b")).thenReturn(UUID.randomUUID());
        when(gateway.user(null)).thenThrow(new ApiError(401,"请先登录"));
        when(gateway.configured()).thenReturn(true);
        when(gateway.explain(anyString(),anyString(),anyString(),anyList())).thenAnswer(i->"回答："+i.getArgument(1));
    }
    JsonNode post(String path,Object body,String token,int status)throws Exception{
        var req=org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/ai/conversations/"+path).contentType("application/json").content(json.writeValueAsString(body));
        if(token!=null)req.header("Authorization",token);
        return json.readTree(mvc.perform(req).andExpect(status().is(status)).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
    }
    UUID open()throws Exception{
        var s=source.sources.entrySet().stream().filter(e->e.getValue().getFirst().path("text").asText().length()>30).findFirst().orElseThrow();
        var id=UUID.randomUUID();post("open",Map.of("id",id,"sourcePath",s.getKey(),"excerpt",s.getValue().getFirst().path("text").asText().substring(0,30)),"Bearer a",200);return id;
    }
    Map<String,Object> send(UUID chat,UUID request,UUID parent,String q){
        var m=new HashMap<String,Object>(Map.of("id",chat,"requestId",request,"question",q,"mode","plain"));if(parent!=null)m.put("parentId",parent);return m;
    }
    @Test void persistsBranchesWithoutSiblingContextAndDeduplicates()throws Exception{
        UUID chat=open(),root=UUID.randomUUID(),left=UUID.randomUUID();
        post("send",send(chat,root,null,"根问题"),"Bearer a",200);
        post("send",send(chat,left,root,"左分支"),"Bearer a",200);
        var request=send(chat,UUID.randomUUID(),root,"右分支");
        var result=post("send",request,"Bearer a",200);assertEquals(3,result.path("turns").size());
        post("send",request,"Bearer a",200);
        verify(gateway,times(3)).explain(anyString(),anyString(),anyString(),anyList());
        verify(gateway).explain(anyString(),eq("右分支"),eq("plain"),eq(List.of(Map.of("role","user","content","根问题"),Map.of("role","assistant","content","回答：根问题"))));
        assertEquals(3,post("read",Map.of("id",chat),"Bearer a",200).path("turns").size());
        assertEquals(3,db.queryForObject("SELECT COUNT(*) FROM ai_calls",Integer.class));
    }
    @Test void rejectsOtherAccountsAndForeignParents()throws Exception{
        UUID chat=open(),root=UUID.randomUUID();post("send",send(chat,root,null,"测试"),"Bearer a",200);
        post("read",Map.of("id",chat),"Bearer b",404);
        post("send",send(chat,UUID.randomUUID(),root,"偷读"),"Bearer b",404);
        post("read",Map.of("id",chat),null,401);
        UUID other=open();post("send",send(other,UUID.randomUUID(),root,"跨树追问"),"Bearer a",400);
        verify(gateway,times(1)).explain(anyString(),anyString(),anyString(),anyList());
    }
    @Test void layoutIsOptimisticAndCannotMoveForeignNodes()throws Exception{
        UUID chat=open(),root=UUID.randomUUID();post("send",send(chat,root,null,"位置"),"Bearer a",200);
        var layout=Map.of("id",chat,"revision",0,"positions",List.of(Map.of("id",root,"x",12,"y",40)));
        post("layout",layout,"Bearer a",200);post("layout",layout,"Bearer a",409);post("layout",layout,"Bearer b",404);
        var result=post("read",Map.of("id",chat),"Bearer a",200);assertEquals(12,result.path("turns").get(0).path("x").asInt());
        post("layout",Map.of("id",chat,"revision",1,"positions",List.of(Map.of("id",UUID.randomUUID(),"x",0,"y",0))),"Bearer a",400);
        assertEquals(1,post("read",Map.of("id",chat),"Bearer a",200).path("conversation").path("revision").asInt());
    }
    @Test void failedCallsStayVisibleAndCannotBeParents()throws Exception{
        UUID chat=open(),root=UUID.randomUUID();when(gateway.explain(anyString(),anyString(),anyString(),anyList())).thenThrow(new ApiError(502,"测试失败"));
        post("send",send(chat,root,null,"失败问题"),"Bearer a",502);
        assertEquals("failed",post("read",Map.of("id",chat),"Bearer a",200).path("turns").get(0).path("state").asText());
        post("send",send(chat,UUID.randomUUID(),root,"追问"),"Bearer a",400);
    }
    @Test void contextIsBounded() {
        var turns=new ArrayList<ConversationController.Turn>();String parent=null;
        for(int i=0;i<20;i++){String id="t"+i;turns.add(new ConversationController.Turn(id,parent,"问","plain","done","答".repeat(10000),i,null,null));parent=id;}
        var context=ConversationController.context(turns,parent);
        assertEquals(8,context.size());assertTrue(context.stream().mapToInt(m->m.get("content").length()).sum()<20000);
    }
}
