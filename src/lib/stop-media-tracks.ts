export function stopMediaTracks(tracks: Iterable<{ stop: () => void } | undefined>) {
  for (const track of tracks) {
    track?.stop();
  }
}
