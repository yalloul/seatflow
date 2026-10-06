package ma.seatflow.shared;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
@RestController @RequestMapping("/api/stream") public class StreamController {private final StreamHub hub;public StreamController(StreamHub h){hub=h;}@GetMapping("/availability") public SseEmitter stream(){return hub.connect();}}
