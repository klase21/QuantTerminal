"use client";

import type { ReactNode } from "react";
import Panel from "@/components/ui/Panel";
import ResizablePanelGroup from "@/components/ResizablePanelGroup";

type DashboardFrameProps = {
  workspace: ReactNode;
  rightRail: ReactNode;
  workspaceCollapsed: boolean;
  rightRailCollapsed: boolean;
  onToggleWorkspace: () => void;
  onToggleRightRail: () => void;
};

export default function DashboardFrame({
  workspace,
  rightRail,
  workspaceCollapsed,
  rightRailCollapsed,
  onToggleWorkspace,
  onToggleRightRail,
}: DashboardFrameProps) {
  return (
    <main className="flex-1 min-h-0 overflow-hidden p-4">
      <ResizablePanelGroup
        left={
          <div className="flex h-full min-h-0 flex-col gap-4">
            <Panel
              title="Execution Workspace"
              right="Core · Lab · Replay · Flow"
              collapsible
              collapsed={workspaceCollapsed}
              onToggle={onToggleWorkspace}
            >
              {!workspaceCollapsed && workspace}
            </Panel>
          </div>
        }
        center={<div />}
        right={
          <div className="h-full min-h-0">
            <Panel
              title="Macro Intelligence"
              right="Alerts · Narrative · Flow"
              collapsible
              collapsed={rightRailCollapsed}
              onToggle={onToggleRightRail}
            >
              {!rightRailCollapsed && rightRail}
            </Panel>
          </div>
        }
      />
    </main>
  );
}
