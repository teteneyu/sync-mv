'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useAudioPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isLooping, setIsLooping] = useState(false);

    const ensureAudio = useCallback(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }
        return audioRef.current;
    }, []);

    const loadAudio = useCallback(
        (file: File) => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);

            const url = URL.createObjectURL(file);
            const audio = ensureAudio();
            audio.pause();
            audio.src = url;
            audio.loop = isLooping;
            audio.onloadedmetadata = () => {
                setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
                setCurrentTime(0);
            };
            audio.onended = () => setIsPlaying(false);
            audio.ontimeupdate = () => setCurrentTime(audio.currentTime);

            setAudioUrl(url);
            setFileName(file.name);
            setIsPlaying(false);
        },
        [audioUrl, ensureAudio, isLooping]
    );

    const toggleLoop = useCallback(() => {
        setIsLooping((prev) => {
            const next = !prev;
            if (audioRef.current) audioRef.current.loop = next;
            return next;
        });
    }, []);

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
            return;
        }

        void audio.play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
    }, [isPlaying]);

    const seekTo = useCallback(
        (seconds: number) => {
            const audio = audioRef.current;
            if (!audio) return;
            const nextTime = Math.max(0, Math.min(seconds, duration || 0));
            audio.currentTime = nextTime;
            setCurrentTime(nextTime);
        },
        [duration]
    );

    const seekRelative = useCallback(
        (delta: number) => {
            const audio = audioRef.current;
            if (!audio) return;
            seekTo(audio.currentTime + delta);
        },
        [seekTo]
    );

    useEffect(() => {
        if (!isPlaying) return;
        const id = window.setInterval(() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }, 80);
        return () => window.clearInterval(id);
    }, [isPlaying]);

    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    return {
        loadAudio,
        togglePlay,
        seekTo,
        seekRelative,
        isPlaying,
        currentTime,
        duration,
        fileName,
        hasAudio: audioUrl !== null,
        audioRef,
        isLooping,
        toggleLoop,
    };
}
