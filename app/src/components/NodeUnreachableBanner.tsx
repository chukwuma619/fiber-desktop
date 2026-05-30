import type { NodePresenceKind } from "../lib/nodePresence";

type NodeUnreachableBannerProps = {
  nodePresence: NodePresenceKind;
  rpcReachable: boolean;
  onGoToNode?: () => void;
};

export function NodeUnreachableBanner({
  nodePresence,
  rpcReachable,
  onGoToNode,
}: NodeUnreachableBannerProps) {
  if (rpcReachable) return null;

  const title =
    nodePresence === "crashed"
      ? "Node crashed — RPC is unavailable"
      : "Node is not reachable";

  const body =
    nodePresence === "crashed"
      ? "Open the Node tab, read the logs, fix the issue, then start your node again before sending or receiving."
      : nodePresence === "stopped"
        ? "Start your node from the Node tab (or Overview), then return here."
        : "Ensure fnn is running and your Node API URL in Setup is correct.";

  return (
    <div className="node-unreachable-banner" role="note">
      <div className="node-unreachable-banner-text">
        <strong className="node-unreachable-banner-title">{title}</strong>
        <p className="node-unreachable-banner-body">{body}</p>
      </div>
      {onGoToNode ? (
        <button
          type="button"
          className="btn btn-secondary btn-sm node-unreachable-banner-action"
          onClick={onGoToNode}
        >
          Open Node tab
        </button>
      ) : null}
    </div>
  );
}
