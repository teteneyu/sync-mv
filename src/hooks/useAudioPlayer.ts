'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

export function useAudioPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isLooping, setIsLooping] = useState(false);
    const animationFrameRef = useRef<number | undefined>(undefined);

    const updateTime = useCallback(() => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            animationFrameRef.current = requestAnimationFrame(updateTime);
        }
    }, []);

    const loadAudio = useCallback(
        (file: File) => {
            // 古いURLを解放
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }

            const url = URL.createObjectURL(file);
            setAudioUrl(url);
            setFileName(file.name);

            if (!audioRef.current) {
                audioRef.current = new Audio();
            }

            const audio = audioRef.current;
            audio.src = url;
            audio.loop = isLooping;

            audio.addEventListener('loadedmetadata', () => {
                setDuration(audio.duration);
            });

            audio.addEventListener('ended', () => {
                setIsPlaying(false);
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
            });
        },
        [audioUrl, isLooping]
    );

    const toggleLoop = useCallback(() => {
        setIsLooping((prev) => {
            const next = !prev;
            if (audioRef.current) {
                audioRef.current.loop = next;
            }
            return next;
        });
    }, []);

    const togglePlay = useCallback(() => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            animationFrameRef.current = requestAnimationFrame(updateTime);
            setIsPlaying(true);
        }
    }, [isPlaying, updateTime]);

    const seekTo = useCallback(
        (seconds: number) => {
            if (!audioRef.current) return;
            audioRef.current.currentTime = Math.max(
                0,
                Math.min(seconds, duration)
            );
            setCurrentTime(audioRef.current.currentTime);
        },
        [duration]
    );

    const seekRelative = useCallback(
        (delta: number) => {
            if (!audioRef.current) return;
            seekTo(audioRef.current.currentTime + delta);
        },
        [seekTo]
    );

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
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
