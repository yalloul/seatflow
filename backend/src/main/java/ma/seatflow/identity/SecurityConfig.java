package ma.seatflow.identity;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

@Configuration
public class SecurityConfig {

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  UserDetailsService users(PasswordEncoder encoder) {
    String password = encoder.encode(
      System.getenv().getOrDefault("DEMO_PASSWORD", "demo1234")
    );
    return new InMemoryUserDetailsManager(
      User.withUsername("client").password(password).roles("CLIENT").build(),
      User.withUsername("abonne").password(password).roles("CLIENT").build(),
      User.withUsername("prioritaire")
        .password(password)
        .roles("CLIENT")
        .build(),
      User.withUsername("organisateur")
        .password(password)
        .roles("ORGANIZER")
        .build(),
      User.withUsername("controleur")
        .password(password)
        .roles("CHECKER")
        .build(),
      User.withUsername("admin").password(password).roles("ADMIN").build()
    );
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http) throws Exception {
    return http
      .csrf(csrf ->
        csrf
          .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
          .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
      )
      .authorizeHttpRequests(auth ->
        auth
          .requestMatchers(
            "/api/auth/csrf",
            "/api/auth/login",
            "/v3/api-docs/**",
            "/docs/**",
            "/swagger-ui/**"
          )
          .permitAll()
          .requestMatchers(
            HttpMethod.GET,
            "/api/events/**",
            "/api/seasons/**",
            "/api/stream/**"
          )
          .permitAll()
          .requestMatchers("/api/admin/**")
          .hasAnyRole("ORGANIZER", "ADMIN")
          .requestMatchers("/api/checkin/**")
          .hasAnyRole("CHECKER", "ADMIN")
          .requestMatchers("/api/holds/**", "/api/orders/**", "/api/passes/**")
          .hasAnyRole("CLIENT", "ADMIN")
          .requestMatchers("/api/**")
          .authenticated()
          .anyRequest()
          .denyAll()
      )
      .exceptionHandling(errors ->
        errors
          .authenticationEntryPoint((req, res, ex) ->
            json(res, 401, "Connexion requise")
          )
          .accessDeniedHandler((req, res, ex) ->
            json(res, 403, "Accès refusé ou session de formulaire expirée")
          )
      )
      .formLogin(form ->
        form
          .loginProcessingUrl("/api/auth/login")
          .successHandler((req, res, auth) ->
            json(res, 200, "Connexion réussie")
          )
          .failureHandler((req, res, ex) ->
            json(res, 401, "Identifiant ou mot de passe incorrect")
          )
      )
      .logout(logout ->
        logout
          .logoutUrl("/api/auth/logout")
          .deleteCookies("JSESSIONID")
          .logoutSuccessHandler((req, res, auth) -> res.setStatus(204))
      )
      .requestCache(cache -> cache.disable())
      .build();
  }

  private static void json(
    jakarta.servlet.http.HttpServletResponse response,
    int status,
    String message
  ) throws java.io.IOException {
    response.setStatus(status);
    response.setContentType("application/json;charset=UTF-8");
    response.getWriter().write("{\"error\":\"" + message + "\"}");
  }
}
