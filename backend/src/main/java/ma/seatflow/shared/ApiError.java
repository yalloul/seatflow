package ma.seatflow.shared;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.*;
import java.util.Map;
@RestControllerAdvice public class ApiError { public static class Conflict extends RuntimeException {public Conflict(String m){super(m);}} public static class Bad extends RuntimeException {public Bad(String m){super(m);}}
 @ExceptionHandler(Conflict.class) ResponseEntity<?> conflict(Conflict e){return ResponseEntity.status(409).body(Map.of("error",e.getMessage()));}
 @ExceptionHandler(Bad.class) ResponseEntity<?> bad(Bad e){return ResponseEntity.badRequest().body(Map.of("error",e.getMessage()));}
 @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class) ResponseEntity<?> validation(){return ResponseEntity.badRequest().body(Map.of("error","Données invalides"));}
 @ExceptionHandler(EmptyResultDataAccessException.class) ResponseEntity<?> missing(){return ResponseEntity.status(404).body(Map.of("error","Ressource introuvable"));}
 @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,org.springframework.web.bind.MissingRequestHeaderException.class}) ResponseEntity<?> malformed(){return ResponseEntity.badRequest().body(Map.of("error","Requête invalide"));}
 @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> db(){return ResponseEntity.status(409).body(Map.of("error","Conflit de données"));}
}
