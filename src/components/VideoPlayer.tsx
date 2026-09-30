'use client';
import { useRef, useState, useEffect } from 'react';

export default function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  const isYouTube = /youtube\.com|youtu\.be/.test(src);

  useEffect(() => {
    if (isYouTube) return;
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => setProgress(v.currentTime);
    const onMeta = () => setDuration(v.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVol = () => setVolume(v.volume);

    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('volumechange', onVol);

    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('volumechange', onVol);
    };
  }, [isYouTube]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * duration;
  }

  function setVol(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  }

  function skip(sec: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + sec));
  }

  function show() {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 2500);
  }

  function fmt(s: number) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  if (isYouTube) {
    const id = src.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1];
    return (
      <div className="aspect-video rounded-2xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video rounded-2xl overflow-hidden bg-black group"
      onMouseMove={show}
      onMouseLeave={() => setShowControls(false)}
    >
      <video ref={videoRef} src={src} className="w-full h-full" onClick={togglePlay} playsInline />

      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 grid place-items-center bg-black/30"
        >
          <div className="w-20 h-20 rounded-full btn-purple grid place-items-center">
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 pt-8 pb-3 transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          onClick={seek}
          className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3"
        >
          <div
            className="h-full bg-purple-500 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="text-white hover:text-purple-300">
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={() => skip(-10)} className="text-white hover:text-purple-300 text-xs">
            ⟲10
          </button>
          <button onClick={() => skip(10)} className="text-white hover:text-purple-300 text-xs">
            10⟳
          </button>
          <button onClick={toggleMute} className="text-white hover:text-purple-300 text-xs">
            {muted || volume === 0 ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={setVol}
            className="w-20 accent-purple-500"
          />
          <span className="text-xs text-white ml-1">
            {fmt(progress)} / {fmt(duration)}
          </span>
          <button
            onClick={toggleFullscreen}
            className="ml-auto text-white hover:text-purple-300 text-xs"
          >
            {fullscreen ? '⤡' : '⤢'}
          </button>
        </div>
      </div>
    </div>
  );
}
