export const timeInSeconds = getMultipliers({oneSecond: 1.0})
export const timeInMillis = getMultipliers({oneSecond: 1000.0})
export const timeInMicros = getMultipliers({oneSecond: 1000000.0})
export const timeInNanos = getMultipliers({oneSecond: 1000000000.0})

function getMultipliers({oneSecond}) {
  const m = {}
  m.seconds = oneSecond

  // below seconds
  m.milliseconds = m.seconds / 1000.0
  m.microseconds = m.milliseconds / 1000.0
  m.nanoseconds = m.microseconds / 1000.0

  // above seconds
  m.minutes = m.seconds * 60.0
  m.hours = m.minutes * 60.0
  m.days = m.hours * 24.0

  // shortcuts
  m.secs = m.seconds
  m.mins = m.minutes
  m.millis = m.milliseconds
  m.micros = m.microseconds
  m.nanos = m.nanoseconds

  // uppercase
  m.MILLISECONDS = m.milliseconds
  m.MICROSECONDS = m.microseconds
  m.NANOSECONDS = m.nanoseconds

  m.SECONDS = m.seconds

  m.MINUTES = m.minutes
  m.HOURS = m.hours
  m.DAYS = m.days

  m.SECS = m.secs
  m.MINS = m.mins
  m.MILLIS = m.millis
  m.MICROS = m.micros
  m.NANOS = m.nanos
  return m
}
