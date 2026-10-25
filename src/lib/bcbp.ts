// IATA Bar Coded Boarding Pass (BCBP, Resolution 792) parser.
// Only the mandatory items are read; conditional/airline-private data is skipped
// using the hex size field that follows each leg's mandatory block.

export interface BoardingPassLeg {
  pnr: string;
  from: string;
  to: string;
  carrier: string;
  flightNumber: string;
  /** Day of year (1-366) as printed on the pass. The year is not encoded. */
  julianDate: number;
  /** ISO date (YYYY-MM-DD) resolved against the reference date. */
  date: string;
  compartment: string;
  seat: string;
  checkInSequence: string;
  passengerStatus: string;
}

export interface BoardingPass {
  formatCode: string;
  surname: string;
  givenName: string;
  electronicTicket: boolean;
  legs: BoardingPassLeg[];
}

export class BcbpError extends Error {}

const HEADER_LENGTH = 23;
const LEG_MANDATORY_LENGTH = 37;

/**
 * Parse the raw text read from a boarding pass barcode (PDF417, Aztec or QR).
 * `referenceDate` is used to resolve the year of each flight; pass the scan time.
 */
export function parseBcbp(raw: string, referenceDate: Date = new Date()): BoardingPass {
  const data = raw.replace(/[\r\n]+$/, "");
  if (data.length < HEADER_LENGTH + LEG_MANDATORY_LENGTH) {
    throw new BcbpError("바코드 데이터가 너무 짧습니다.");
  }
  const formatCode = data[0];
  if (formatCode !== "M") {
    throw new BcbpError("지원하지 않는 바코드 형식입니다.");
  }
  const legCount = Number(data[1]);
  if (!Number.isInteger(legCount) || legCount < 1 || legCount > 4) {
    throw new BcbpError("구간 수를 읽을 수 없습니다.");
  }

  const [surname, givenName = ""] = data.slice(2, 22).trim().split("/");
  const electronicTicket = data[22] === "E";

  const legs: BoardingPassLeg[] = [];
  let pos = HEADER_LENGTH;
  for (let i = 0; i < legCount; i++) {
    const block = data.slice(pos, pos + LEG_MANDATORY_LENGTH);
    if (block.length < LEG_MANDATORY_LENGTH) {
      throw new BcbpError(`${i + 1}번째 구간 데이터가 잘렸습니다.`);
    }
    const julianDate = Number(block.slice(21, 24));
    if (!Number.isInteger(julianDate) || julianDate < 1 || julianDate > 366) {
      throw new BcbpError(`${i + 1}번째 구간의 날짜를 읽을 수 없습니다.`);
    }
    const from = block.slice(7, 10).trim();
    const to = block.slice(10, 13).trim();
    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
      throw new BcbpError(`${i + 1}번째 구간의 공항 코드를 읽을 수 없습니다.`);
    }

    legs.push({
      pnr: block.slice(0, 7).trim(),
      from,
      to,
      carrier: block.slice(13, 16).trim(),
      flightNumber: stripLeadingZeros(block.slice(16, 21).trim()),
      julianDate,
      date: resolveJulianDate(julianDate, referenceDate),
      compartment: block.slice(24, 25),
      seat: stripLeadingZeros(block.slice(25, 29).trim()),
      checkInSequence: stripLeadingZeros(block.slice(29, 34).trim()),
      passengerStatus: block.slice(34, 35),
    });

    const variableSize = parseInt(block.slice(35, 37), 16);
    pos += LEG_MANDATORY_LENGTH + (Number.isNaN(variableSize) ? 0 : variableSize);
  }

  return { formatCode, surname, givenName: stripTitle(givenName), electronicTicket, legs };
}

/** Pick the year that puts the day-of-year closest to the reference date. */
export function resolveJulianDate(dayOfYear: number, referenceDate: Date): string {
  const refYear = referenceDate.getUTCFullYear();
  let best: Date | null = null;
  for (const year of [refYear - 1, refYear, refYear + 1]) {
    const candidate = new Date(Date.UTC(year, 0, dayOfYear));
    // Day 366 rolls into the next year when the year is not a leap year.
    if (candidate.getUTCFullYear() !== year) continue;
    if (!best || Math.abs(candidate.getTime() - referenceDate.getTime()) < Math.abs(best.getTime() - referenceDate.getTime())) {
      best = candidate;
    }
  }
  return best!.toISOString().slice(0, 10);
}

function stripLeadingZeros(value: string): string {
  return value.replace(/^0+(?=.)/, "");
}

function stripTitle(givenName: string): string {
  return givenName.replace(/\s+(MR|MRS|MS|MISS|MSTR|DR)$/, "").trim();
}
