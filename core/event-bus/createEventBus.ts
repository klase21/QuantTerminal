import type { TerminalEvent } from "./types"

type Listener = (event: TerminalEvent) => void

export function createTerminalEventBus(maxEvents = 250) {
  let events: TerminalEvent[] = []
  const listeners = new Set<Listener>()

  function emit(event: TerminalEvent) {
    events = [event, ...events].slice(0, maxEvents)
    listeners.forEach((listener) => listener(event))
    return event
  }

  function subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function getEvents() {
    return events
  }

  function clear() {
    events = []
  }

  return { emit, subscribe, getEvents, clear }
}
