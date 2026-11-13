package cn.zhixu;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
class WebConfig implements WebMvcConfigurer {
    @Value("${zhixu.origins}") String origins;
    @Override public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/v1/**").allowedOrigins(origins.split(","))
            .allowedMethods("GET", "POST").allowedHeaders("Authorization", "Content-Type")
            .allowCredentials(false).maxAge(600);
    }
}
