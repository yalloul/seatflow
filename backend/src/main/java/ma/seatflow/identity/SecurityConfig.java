package ma.seatflow.identity;
import org.springframework.context.annotation.*;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import static org.springframework.security.config.Customizer.withDefaults;
@Configuration public class SecurityConfig {
 @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
 @Bean UserDetailsService users(PasswordEncoder encoder){var p=System.getenv().getOrDefault("DEMO_PASSWORD","demo1234"); return new InMemoryUserDetailsManager(
 User.withUsername("client").password(encoder.encode(p)).roles("CLIENT").build(),User.withUsername("abonne").password(encoder.encode(p)).roles("CLIENT").build(),User.withUsername("prioritaire").password(encoder.encode(p)).roles("CLIENT").build(),User.withUsername("organisateur").password(encoder.encode(p)).roles("ORGANIZER").build(),User.withUsername("controleur").password(encoder.encode(p)).roles("CHECKER").build(),User.withUsername("admin").password(encoder.encode(p)).roles("ADMIN").build());}
 @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {return http.csrf(c->c.disable()).cors(withDefaults()).authorizeHttpRequests(a->a.requestMatchers("/api/events/**","/api/venues/**","/api/stream/**","/v3/api-docs/**","/docs/**","/swagger-ui/**").permitAll().requestMatchers("/api/admin/**").hasAnyRole("ORGANIZER","ADMIN").requestMatchers("/api/checkin/**").hasAnyRole("CHECKER","ADMIN").requestMatchers("/api/**").authenticated().anyRequest().permitAll()).httpBasic(withDefaults()).build();}
 @Bean org.springframework.web.cors.CorsConfigurationSource cors(){var c=new org.springframework.web.cors.CorsConfiguration();c.setAllowedOrigins(java.util.List.of("http://localhost:5173"));c.setAllowedMethods(java.util.List.of("GET","POST","PUT","DELETE","OPTIONS"));c.setAllowedHeaders(java.util.List.of("Authorization","Content-Type","Idempotency-Key"));var s=new org.springframework.web.cors.UrlBasedCorsConfigurationSource();s.registerCorsConfiguration("/**",c);return s;}
}
