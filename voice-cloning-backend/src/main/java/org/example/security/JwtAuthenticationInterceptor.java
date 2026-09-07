package org.example.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import tools.jackson.core.JacksonException;

/**
 * Verifies the HS256 bearer tokens issued by aasist_repo/login_system/auth.py.
 * Authentication is intentionally stateless: token issuance and verification
 * share one SECRET_KEY, configured outside source control.
 */
@Component
public class JwtAuthenticationInterceptor implements HandlerInterceptor {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final String HMAC_SHA_256 = "HmacSHA256";

    private final byte[] secret;

    public JwtAuthenticationInterceptor(@Value("${security.jwt.secret:}") String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("SECRET_KEY must be configured before starting the API");
        }
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler) throws IOException {

        // Allow CORS preflight requests; actual requests remain authenticated.
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith("Bearer ")
                || !isValid(authorization.substring("Bearer ".length()).trim())) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "A valid bearer token is required");
            return false;
        }

        return true;
    }

    private boolean isValid(String token) {
        try {
            String[] parts = token.split("\\.", -1);
            if (parts.length != 3) {
                return false;
            }

            Base64.Decoder decoder = Base64.getUrlDecoder();
            JsonNode header = OBJECT_MAPPER.readTree(decoder.decode(parts[0]));
            JsonNode payload = OBJECT_MAPPER.readTree(decoder.decode(parts[1]));
            if (header == null || payload == null || !"HS256".equals(header.path("alg").asText())) {
                return false;
            }

            Mac mac = Mac.getInstance(HMAC_SHA_256);
            mac.init(new SecretKeySpec(secret, HMAC_SHA_256));
            byte[] expectedSignature = mac.doFinal(
                    (parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
            byte[] suppliedSignature = decoder.decode(parts[2]);
            if (!MessageDigest.isEqual(expectedSignature, suppliedSignature)) {
                return false;
            }

            JsonNode expiration = payload.get("exp");
            JsonNode subject = payload.get("sub");
            return expiration != null
                    && expiration.isIntegralNumber()
                    && Instant.now().getEpochSecond() < expiration.asLong()
                    && subject != null
                    && subject.isTextual()
                    && !subject.asText().isBlank();
        } catch (IllegalArgumentException | GeneralSecurityException | JacksonException exception) {
            return false;
        }
    }
}
