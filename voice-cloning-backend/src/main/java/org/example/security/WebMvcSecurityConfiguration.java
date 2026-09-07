package org.example.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcSecurityConfiguration implements WebMvcConfigurer {

    private final JwtAuthenticationInterceptor jwtAuthenticationInterceptor;
    private final String[] allowedOrigins;

    public WebMvcSecurityConfiguration(
            JwtAuthenticationInterceptor jwtAuthenticationInterceptor,
            @Value("${security.cors.allowed-origins}") String allowedOrigins) {
        this.jwtAuthenticationInterceptor = jwtAuthenticationInterceptor;
        this.allowedOrigins = allowedOrigins.split(",");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(jwtAuthenticationInterceptor)
                .addPathPatterns("/calls/**", "/detections/**", "/alerts/**");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type");
    }
}
