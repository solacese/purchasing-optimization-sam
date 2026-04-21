import { useEffect, useRef, useState, useCallback } from "react";
import { createEventSource } from "../lib/api";

export default function useEventStream(maxEvents = 200) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const es = createEventSource();
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        setEvents((prev) => {
          const next = [data, ...prev];
          return next.length > maxEvents ? next.slice(0, maxEvents) : next;
        });
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      setTimeout(connect, 3000);
    };
  }, [maxEvents]);

  useEffect(() => {
    connect();
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, [connect]);

  return { events, connected };
}
