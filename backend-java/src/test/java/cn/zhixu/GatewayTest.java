package cn.zhixu;

import com.sun.net.httpserver.HttpServer;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class GatewayTest {
    @Test void validatesTokenWithSupabaseAndCallsCompatibleModel() throws Exception {
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        UUID user=UUID.randomUUID();
        server.createContext("/auth/v1/user",e->{
            boolean valid=java.util.Set.of("Bearer valid", "Bearer "+"x".repeat(24000)).contains(e.getRequestHeaders().getFirst("Authorization"));
            byte[] body=(valid?"{\"id\":\""+user+"\"}":"{}").getBytes(StandardCharsets.UTF_8);
            e.sendResponseHeaders(valid?200:401,body.length);e.getResponseBody().write(body);e.close();
        });
        server.createContext("/v1/chat/completions",e->{
            byte[] body="{\"choices\":[{\"message\":{\"content\":\"测试讲解\"}}]}".getBytes(StandardCharsets.UTF_8);
            e.sendResponseHeaders(200,body.length);e.getResponseBody().write(body);e.close();
        });
        server.start();
        try {
            var gateway=new Gateway(new ObjectMapper());gateway.supabase="http://127.0.0.1:"+server.getAddress().getPort();gateway.key="public";gateway.aiUrl=gateway.supabase+"/v1";gateway.aiKey="test-only";gateway.model="test";
            assertEquals(user,gateway.user("Bearer valid"));
            assertEquals(user,gateway.user("Bearer "+"x".repeat(24000)));
            assertEquals(431,assertThrows(ApiError.class,()->gateway.user("Bearer "+"x".repeat(32768))).status);
            assertEquals(401,assertThrows(ApiError.class,()->gateway.user("Bearer invalid")).status);
            assertEquals("测试讲解",gateway.explain("示例段落","为什么","plain"));
        } finally {server.stop(0);}
    }
}
