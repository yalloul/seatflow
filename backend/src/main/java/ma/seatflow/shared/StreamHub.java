package ma.seatflow.shared;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
@Component public class StreamHub { private final CopyOnWriteArrayList<SseEmitter> clients=new CopyOnWriteArrayList<>(); public SseEmitter connect(){var e=new SseEmitter(0L);clients.add(e);e.onCompletion(()->clients.remove(e));e.onError(x->clients.remove(e));return e;} public void changed(long eventId){for(var e:clients)try{e.send(SseEmitter.event().name("availability").data(eventId));}catch(Exception x){clients.remove(e);}} }
