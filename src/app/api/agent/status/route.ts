import { NextResponse } from "next/server";
import { readAgentLlmProviderStatus } from "@/features/reader/infrastructure/agentLlm/agentLlmEnv";

export async function GET() {
  return NextResponse.json(readAgentLlmProviderStatus());
}
