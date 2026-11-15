import { useEffect, useState } from "react";
import { api } from "./api.js";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useSingers() {
  const [singers, setSingers] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/api/singers")
      .then((d) => setSingers(d.singers))
      .catch(() => setError("Could not load singers."));
  }, []);
  return { singers, error };
}
