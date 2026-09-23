import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function url(source) {
  return `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText).toString("base64")}`;
}
const { registrationState, defaultRegistrationDeadline: defaults,
  registrationCountdownSeconds: seconds, registrationClockDelay: delay,
  validRegistrationDeadline: valid } = await import(url(fs.readFileSync("lib/registration.ts", "utf8")));
const now = 1800000000000, minute = 60000, hour = 60 * minute, day = 24 * hour;
for (const [remaining, expected] of [
  [49 * hour, null], [48 * hour, null], [48 * hour - 1, 172800],
  [hour + 1, 3601], [hour, 3600], [hour - 1, 3600], [hour - 1000, 3599],
  [minute + 1, 61], [minute, 60], [minute - 1, 60], [minute - 1000, 59],
  [1001, 2], [1000, 1], [999, 1], [1, 1], [0, 0], [-1, 0], [-day, 0],
]) {
  assert.equal(seconds(now + remaining, now), expected, `Digital countdown at ${remaining} ms`);
}
for (const invalid of [NaN, Infinity, -Infinity]) assert.equal(seconds(invalid, now), null);
assert.equal(delay(undefined, now, 1000), minute);
assert.equal(delay(now + 49 * hour, now, 1000), minute);
assert.equal(delay(now + 48 * hour + 500, now, 1000), 501);
assert.equal(delay(now + 48 * hour, now, 1000), 1);
assert.equal(delay(now + 48 * hour - 1, now, 1000), 1000);
assert.equal(delay(now + hour, now), minute, "Non-digital booking clocks keep their cadence");
assert.equal(delay(now + hour, now, 1000), 1000);
assert.equal(delay(now + 500, now, 1000), 500, "Wake at the exact registration cutoff");
assert.equal(delay(now + 1, now, 1000), 1);
assert.equal(delay(now, now, 1000), minute, "Expired timers no longer tick every second");
assert.equal(delay(now - day, now, 1000), minute);
assert.equal(defaults(now + 2 * day, now), now + day);
assert.equal(defaults(now + day, now), now + day);
assert.equal(defaults(now + hour, now), now + hour);
assert.equal(valid(now + hour, now + hour, now), true);
for (const deadline of [NaN, Infinity, now, now - hour, now + 2 * hour, now + minute]) {
  assert.equal(valid(deadline, now + hour, now), false);
}
const event = { starts_at: now + hour, registration_ends_at: now + minute, remaining: 1 };
assert.equal(registrationState(event, now), "open");
assert.equal(registrationState({ ...event, remaining: 0 }, now), "sold_out");
assert.equal(registrationState({ ...event, remaining: 0 }, now + minute), "expired");
assert.equal(registrationState(event, now + hour), "started");
console.log("PASS registration defaults, validation, card/digital countdown boundaries, refresh cadence and state precedence");
