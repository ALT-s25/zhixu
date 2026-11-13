package cn.zhixu;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

public class ApiError extends RuntimeException {
    final int status;
    public ApiError(int status, String message) { super(message); this.status=status; }
}

@RestControllerAdvice
class Errors {
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    ResponseEntity<?> malformed(Exception e) { return ResponseEntity.badRequest().body(Map.of("message", "请求格式不正确，请刷新页面后重试")); }
    @ExceptionHandler(ApiError.class)
    ResponseEntity<?> known(ApiError e) { return ResponseEntity.status(e.status).body(Map.of("message", e.getMessage())); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> other(Exception e) { return ResponseEntity.status(500).body(Map.of("message", "服务暂时不可用，请稍后重试")); }
}
