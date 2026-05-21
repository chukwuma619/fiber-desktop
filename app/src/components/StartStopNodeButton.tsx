type StartStopNodeButtonProps = {
  locallyRunning: boolean;
  disableStartBecauseRemote: boolean;
  onStart: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
};

export function StartStopNodeButton({
  locallyRunning,
  disableStartBecauseRemote,
  onStart,
  onStop,
}: StartStopNodeButtonProps) {
  if (locallyRunning) {
    return (
      <button
        type="button"
        className="btn btn-danger-ghost"
        onClick={() => void onStop()}
      >
        Stop node
      </button>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={disableStartBecauseRemote}
      title={
        disableStartBecauseRemote
          ? "Another fnn is already using this data folder or RPC is live elsewhere. Stop that process first, then start here."
          : undefined
      }
      onClick={() => void onStart()}
    >
      Start node
    </button>
  );
}
