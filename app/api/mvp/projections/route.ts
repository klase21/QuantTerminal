import { NextResponse } from "next/server";

import {
  MVP_CONSUMER_INSTRUMENTS,
  MvpConsumerFacadeError,
  type MvpConsumerInstrument,
  type MvpConsumerView,
} from "@/lib/data-platform/consumer-projections";
import { withMvpConsumerProjectionFacade } from "@/lib/data-platform/consumer-projections/server";
import { servingHeaders } from "@/lib/data-platform/mvp-serving/server";
import { resolveMvpServingMode } from "@/lib/data-platform/mvp-serving/mode";
import { normalizeMvpRouteContext } from "@/lib/mvp-route-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIEWS = new Set<MvpConsumerView>([
  "dashboard",
  "markets",
  "scanner",
  "trade",
  "replay",
  "research",
]);
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

function iso(value: string | null): string | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed))
    throw new MvpConsumerFacadeError("INVALID_QUERY", "Invalid UTC timestamp.");
  return new Date(parsed).toISOString();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get("view") as MvpConsumerView | null;
    if (!view || !VIEWS.has(view))
      throw new MvpConsumerFacadeError(
        "INVALID_QUERY",
        "A supported view is required.",
      );
    const normalized = normalizeMvpRouteContext(view, url.searchParams);
    const rawInstrument = normalized.get("instrument")?.toUpperCase();
    const instrument =
      rawInstrument &&
      MVP_CONSUMER_INSTRUMENTS.includes(rawInstrument as MvpConsumerInstrument)
        ? (rawInstrument as MvpConsumerInstrument)
        : undefined;
    if (rawInstrument && !instrument)
      throw new MvpConsumerFacadeError(
        "INVALID_QUERY",
        "Unsupported instrument.",
      );
    const start = iso(normalized.get("start")),
      end = iso(normalized.get("end"));
    if (
      (start && !end) ||
      (!start && end) ||
      (start &&
        end &&
        (Date.parse(end) <= Date.parse(start) ||
          Date.parse(end) - Date.parse(start) > MAX_WINDOW_MS))
    )
      throw new MvpConsumerFacadeError(
        "INVALID_QUERY",
        "The requested range must be a positive UTC window no longer than 24 hours.",
      );
    const { result, context } = await withMvpConsumerProjectionFacade(async (facade, context) => ({
      result: await facade.read({
        view,
        instrument,
        start,
        end,
        candidateId: normalized.get("candidate") ?? undefined,
        projectionVersionId: normalized.get("projection") ?? undefined,
      }), context,
    }));
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        ...servingHeaders(context),
      },
    });
  } catch (error) {
    if (error instanceof MvpConsumerFacadeError) {
      const reasonCode = error.reasonCode === "PROJECTION_MISSING" && resolveMvpServingMode() !== "local_truth" ? "SERVING_PROJECTION_MISSING" : error.reasonCode;
      const status =
        error.reasonCode === "INVALID_QUERY"
          ? 400
          : error.reasonCode === "ROLLBACK_ACTIVE"
            ? 409
            : error.reasonCode === "PROJECTION_MISSING"
              ? 404
              : 403;
      return NextResponse.json(
        { status: reasonCode, reason: error.message },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error(
      "MVP_PROJECTION_READ_ERROR",
      error instanceof Error ? error.message : "UNKNOWN",
    );
    const reasonCode = classifyServingFailure(error);
    return NextResponse.json(
      { status: reasonCode, reason: "The governed serving Projection read failed." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function classifyServingFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return ["SERVING_CORPUS_UNAVAILABLE", "SERVING_CORPUS_CHECKSUM_MISMATCH", "CERTIFIED_SNAPSHOT_CHECKSUM_MISMATCH", "SERVING_EVIDENCE_SUMMARY_MISSING"].find((code) => message.includes(code)) ?? "READ_ERROR";
}
