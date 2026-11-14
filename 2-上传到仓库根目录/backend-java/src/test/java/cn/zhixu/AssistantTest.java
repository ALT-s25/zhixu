package cn.zhixu;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:test;DB_CLOSE_DELAY=-1","zhixu.daily-limit=3"})
@AutoConfigureMockMvc
class AssistantTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired Quota quota;
    @Autowired JdbcTemplate db;
    @Autowired AssistantController controller;
    @MockitoBean Gateway gateway;
    UUID user=UUID.randomUUID();
    @BeforeEach void setup() {
        db.update("DELETE FROM ai_calls");
        when(gateway.user("Bearer valid")).thenReturn(user);
        when(gateway.user(null)).thenThrow(new ApiError(401,"请先登录"));
        when(gateway.configured()).thenReturn(true);
        when(gateway.explain(anyString(),anyString(),anyString())).thenReturn("这是经过模型接口返回的测试讲解。");
    }
    Map<String,Object> input() {
        var source=controller.sources.entrySet().stream().filter(e->e.getValue().getFirst().path("text").asText().length()>30).findFirst().orElseThrow();
        return new HashMap<>(Map.of("requestId",UUID.randomUUID().toString(),"sourcePath",source.getKey(),"excerpt",source.getValue().getFirst().path("text").asText().substring(0,30),"mode","plain","question",""));
    }
    @Test void rejectsAnonymous() throws Exception {
        mvc.perform(post("/api/v1/ai/explain").contentType("application/json").content(json.writeValueAsString(input()))).andExpect(status().isUnauthorized());
        verify(gateway,never()).explain(anyString(),anyString(),anyString());
    }
    @Test void sameRequestCallsModelOnce() throws Exception {
        String body=json.writeValueAsString(input());
        for(int n=0;n<2;n++)mvc.perform(post("/api/v1/ai/explain").header("Authorization","Bearer valid").contentType("application/json").content(body)).andExpect(status().isOk()).andExpect(jsonPath("remaining").value(2));
        verify(gateway,times(1)).explain(anyString(),anyString(),anyString());
    }
    @Test void rejectsForgedExcerpt() throws Exception {
        var input=input();input.put("excerpt","this excerpt does not occur in the actual source 23948349");
        mvc.perform(post("/api/v1/ai/explain").header("Authorization","Bearer valid").contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isBadRequest());
        assertEquals(3,quota.remaining(user));
    }
    @Test void privateCloudDocumentRequiresRlsRead() throws Exception {
        var input=input();input.remove("sourcePath");input.put("documentId",UUID.randomUUID().toString());
        when(gateway.request(anyString(),anyString(),isNull(),eq(true))).thenReturn(json.readTree("[]"));
        mvc.perform(post("/api/v1/ai/explain").header("Authorization","Bearer valid").contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isNotFound());
        verify(gateway,never()).explain(anyString(),anyString(),anyString());
    }
    @Test void unconfiguredDoesNotCharge() throws Exception {
        when(gateway.configured()).thenReturn(false);
        mvc.perform(post("/api/v1/ai/explain").header("Authorization","Bearer valid").contentType("application/json").content(json.writeValueAsString(input()))).andExpect(status().isServiceUnavailable());
        assertEquals(3,quota.remaining(user));
    }
    @Test void providerFailureIsChargedButDoesNotLeakDetails() throws Exception {
        when(gateway.explain(anyString(),anyString(),anyString())).thenThrow(new ApiError(502,"模型服务调用失败"));
        mvc.perform(post("/api/v1/ai/explain").header("Authorization","Bearer valid").contentType("application/json").content(json.writeValueAsString(input()))).andExpect(status().isBadGateway());
        assertEquals(2,quota.remaining(user));
    }
    @Test void parallelRequestsCannotExceedQuota() throws Exception {
        try(var executor=Executors.newFixedThreadPool(10)) {
            var jobs=new ArrayList<Callable<Boolean>>();
            for(int i=0;i<12;i++) jobs.add(()->{try{quota.reserve(user,UUID.randomUUID(),"hash");return true;}catch(ApiError e){return false;}});
            long count=0;for(var future:executor.invokeAll(jobs))if(future.get())count++;
            assertEquals(3,count);assertEquals(0,quota.remaining(user));
        }
        var newService=new Quota(db);newService.limit=3;assertEquals(0,newService.remaining(user));
    }
    @Test void blockedCorsOrigin() throws Exception {
        mvc.perform(options("/api/v1/ai/explain").header("Origin","https://evil.example").header("Access-Control-Request-Method","POST")).andExpect(status().isForbidden());
    }
}
