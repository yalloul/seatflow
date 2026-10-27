package ma.seatflow.identity;

import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  @GetMapping("/csrf")
  public Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken());
  }

  @GetMapping("/me")
  public Map<String, Object> me(Authentication authentication) {
    return Map.of(
      "username",
      authentication.getName(),
      "roles",
      authentication
        .getAuthorities()
        .stream()
        .map(authority -> authority.getAuthority().replace("ROLE_", ""))
        .toList()
    );
  }
}
