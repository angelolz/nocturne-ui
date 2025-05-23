import React, { useState, useRef } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import Link from "next/link";
import Image from "next/image";
import classNames from "classnames";

import Drawer, {
  DrawerTrigger,
  DrawerContent,
} from "@/components/common/navigation/Drawer";
import Redirect from "@/components/common/navigation/Redirect";
import { getTextDirection } from "@/constants/fonts";
import ProgressBar from "@/components/player/ProgressBar";
import DeviceSwitcherModal from "@/components/common/modals/DeviceSwitcherModal";

import { useNowPlaying } from "@/hooks/useNowPlaying";
import { useLyrics } from "@/hooks/useLyrics";
import { useTrackScroll } from "@/hooks/useTrackScroll";
import { usePlaybackControls } from "@/hooks/usePlaybackControls";
import { usePlaylistDialog } from "@/hooks/usePlaylistDialog";
import { useAppState } from "@/hooks/useAppState";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { inter } from "@/constants/fonts";

import {
  HeartIcon,
  HeartIconFilled,
  BackIcon,
  PauseIcon,
  PlayIcon,
  ForwardIcon,
  MenuIcon,
  VolumeOffIcon,
  VolumeLowIcon,
  VolumeLoudIcon,
  PlaylistAddIcon,
  DeviceSwitcherIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  LyricsIcon,
  DJIcon,
} from "@/components/icons";

export default function NowPlaying({
  accessToken,
  currentPlayback,
  fetchCurrentPlayback,
  drawerOpen,
  setDrawerOpen,
  setActiveSection,
  updateGradientColors,
  handleError,
  showBrightnessOverlay,
  estimatedProgress,
}) {
  useAppState({
    currentPlayback,
    setActiveSection,
    updateGradientColors,
    drawerOpen,
    setDrawerOpen,
  });

  const [isDeviceSwitcherOpen, setIsDeviceSwitcherOpen] = useState(false);
  const [isProgressScrubbing, setIsProgressScrubbing] = useState(false);
  const [liveProgress, setLiveProgress] = useState(0);

  const {
    showLyrics,
    parsedLyrics,
    currentLyricIndex,
    isLoadingLyrics,
    lyricsUnavailable,
    lyricsMenuOptionEnabled,
    lyricsContainerRef,
    handleToggleLyrics,
  } = useLyrics({ currentPlayback });

  const {
    isLiked,
    volume,
    isVolumeVisible,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    changeVolume,
    toggleLikeTrack,
    handleWheelScroll,
    handleTouchStart,
    handleTouchEnd,
  } = useNowPlaying({
    accessToken,
    currentPlayback,
    fetchCurrentPlayback,
    showLyrics,
    lyricsMenuOptionEnabled,
    handleToggleLyrics,
    handleError,
    showBrightnessOverlay,
    drawerOpen,
    isProgressScrubbing,
  });

  const { isShuffled, repeatMode, toggleShuffle, toggleRepeat } =
    usePlaybackControls({
      currentPlayback,
      accessToken,
      fetchCurrentPlayback,
    });

  const { open, playlists, addTrackToPlaylist, handleAddAnyway, handleClose } =
    usePlaylistDialog({
      accessToken,
      currentPlayback,
    });

  const trackName = currentPlayback?.item
    ? currentPlayback.item.type === "episode"
      ? currentPlayback.item.name
      : currentPlayback.item.name || "Not Playing"
    : currentPlayback?.context?.uri ===
        "spotify:playlist:37i9dQZF1EYkqdzj48dyYq" && !currentPlayback?.item
    ? "Up next"
    : "Not Playing";

  const { trackNameScrollingEnabled, shouldScroll, trackNameRef } =
    useTrackScroll(trackName);

  const { elapsedTimeEnabled, remainingTimeEnabled, showTimeDisplay } =
    useElapsedTime();

  const artistName = currentPlayback?.item
    ? currentPlayback.item.type === "episode"
      ? currentPlayback.item.show.name
      : currentPlayback.item.artists.map((artist) => artist.name).join(", ")
    : currentPlayback?.context?.uri ===
        "spotify:playlist:37i9dQZF1EYkqdzj48dyYq" && !currentPlayback?.item
    ? "DJ X"
    : "";

  const albumArt = currentPlayback?.item
    ? currentPlayback.item.type === "episode"
      ? currentPlayback.item.show.images[0]?.url || "/images/not-playing.webp"
      : currentPlayback.item.type === "local" ||
        !currentPlayback.item?.album?.images?.[0]?.url ||
        !currentPlayback.item?.album?.images?.[0]
      ? "/images/not-playing.webp"
      : currentPlayback.item.album.images[0].url
    : currentPlayback?.context?.uri ===
        "spotify:playlist:37i9dQZF1EYkqdzj48dyYq" && !currentPlayback?.item
    ? "/images/radio-cover/dj.webp"
    : "/images/not-playing.webp";

  const isPlaying = currentPlayback?.is_playing || false;
  const [isSeeking, setIsSeeking] = useState(false);
  const [localProgress, setProgress] = useState(estimatedProgress);
  const seekTimeoutRef = useRef(null);
  const getTextStyles = (text) => {
    const { direction, script } = getTextDirection(text);

    const fontClasses = {
      arabic: "font-noto-naskh-ar",
      hebrew: "font-noto-sans-he",
      chinese: "font-noto-sans-sc",
      japanese: "font-noto-serif-jp",
      korean: "font-noto-sans-kr",
      bengali: "font-noto-sans-bn",
      tamil: "font-noto-sans-ta",
      thai: "font-noto-sans-th",
    };

    return {
      className: `text-[40px] font-[580] tracking-tight transition-colors duration-1000 ease-in-out
        ${direction === "rtl" ? "text-right" : "text-left"}
        ${fontClasses[script] || ""}`,
    };
  };

  const convertTimeToLength = (ms, elapsed) => {
    let totalSeconds = Math.floor(ms / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedMinutes = minutes.toString().padStart(2, "0");
    const formattedSeconds = seconds.toString().padStart(2, "0");

    if (hours > 0) {
      return `${
        !elapsed ? "-" : ""
      }${hours}:${formattedMinutes}:${formattedSeconds}`;
    }

    return `${!elapsed ? "-" : ""}${formattedMinutes}:${formattedSeconds}`;
  };

  const PlayPauseButton = () =>
    isPlaying ? (
      <PauseIcon className="w-14 h-14" />
    ) : (
      <PlayIcon className="w-14 h-14" />
    );

  const VolumeIcon = () => {
    if (volume === 0) return <VolumeOffIcon className="w-7 h-7" />;
    if (volume > 0 && volume <= 60)
      return <VolumeLowIcon className="w-7 h-7 ml-1.5" />;
    return <VolumeLoudIcon className="w-7 h-7" />;
  };

  const handleDJSignal = async () => {
    try {
      const deviceId = currentPlayback?.device?.id;
      if (!deviceId) return;

      await fetch(
        `https://gue1-spclient.spotify.com/connect-state/v1/player/command/from/${deviceId}/to/${deviceId}`,
        {
          method: "POST",
          headers: {
            "accept-language": "en",
            "app-platform": "Win32_x86_64",
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: '{"command": {"endpoint": "signal", "signal_id": "jump"}}',
        }
      );
    } catch (error) {
      handleError("DJ_SIGNAL_ERROR", error.message);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1 h-screen w-full z-10 fadeIn-animation">
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div className="md:w-1/3 flex flex-row items-center px-12 pt-10">
            <div className="min-w-[280px] mr-8">
              <Redirect
                href={
                  !currentPlayback ||
                  currentPlayback?.item?.is_local ||
                  !currentPlayback?.item?.album?.id
                    ? ""
                    : currentPlayback?.item?.type === "episode"
                    ? `/show/${currentPlayback.item.show.id}`
                    : `/album/${currentPlayback?.item?.album?.id}`
                }
                accessToken={accessToken}
              >
                <Image
                  src={albumArt}
                  alt={
                    currentPlayback?.item?.type === "episode"
                      ? "Podcast Cover"
                      : "Album Art"
                  }
                  width={280}
                  height={280}
                  priority
                  className="aspect-square rounded-[12px] drop-shadow-xl"
                />
              </Redirect>
            </div>

            {!showLyrics || !currentPlayback?.item ? (
              <div className="flex-1 text-center md:text-left">
                {currentPlayback?.context?.uri ===
                  "spotify:playlist:37i9dQZF1EYkqdzj48dyYq" &&
                !currentPlayback?.item ? (
                  <h4 className="text-[40px] font-[580] text-white truncate tracking-tight max-w-[400px]">
                    {trackName}
                  </h4>
                ) : (
                  <Redirect
                    href={
                      !currentPlayback ||
                      currentPlayback?.item?.is_local ||
                      !currentPlayback?.item?.album?.id
                        ? ""
                        : currentPlayback?.item?.type === "episode"
                        ? `/show/${currentPlayback.item.show.id}`
                        : `/album/${currentPlayback?.item?.album?.id}`
                    }
                    accessToken={accessToken}
                  >
                    {trackNameScrollingEnabled ? (
                      <div className="track-name-container">
                        <h4
                          ref={trackNameRef}
                          key={currentPlayback?.item?.id || "not-playing"}
                          className={`track-name text-[40px] font-[580] text-white tracking-tight whitespace-nowrap ${
                            trackNameScrollingEnabled && shouldScroll
                              ? "animate-scroll"
                              : ""
                          }`}
                        >
                          {trackName}
                        </h4>
                      </div>
                    ) : (
                      <h4 className="text-[40px] font-[580] text-white truncate tracking-tight max-w-[400px]">
                        {trackName}
                      </h4>
                    )}
                  </Redirect>
                )}
                {currentPlayback?.context?.uri ===
                  "spotify:playlist:37i9dQZF1EYkqdzj48dyYq" &&
                !currentPlayback?.item ? (
                  <h4 className="text-[36px] font-[560] text-white/60 truncate tracking-tight max-w-[380px]">
                    {artistName}
                  </h4>
                ) : (
                  <Redirect
                    href={
                      currentPlayback?.item?.is_local
                        ? ""
                        : currentPlayback?.item?.type === "episode"
                        ? `/show/${currentPlayback.item.show.id}`
                        : `/artist/${currentPlayback?.item?.artists[0]?.id}`
                    }
                    accessToken={accessToken}
                  >
                    <h4 className="text-[36px] font-[560] text-white/60 truncate tracking-tight max-w-[380px]">
                      {artistName}
                    </h4>
                  </Redirect>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-[280px]">
                <div
                  className="flex-1 text-left overflow-y-auto h-[280px] w-[380px]"
                  ref={lyricsContainerRef}
                >
                  {isLoadingLyrics ? (
                    <p className="text-white text-[40px] font-[580] tracking-tight transition-colors duration-300">
                      Loading lyrics...
                    </p>
                  ) : parsedLyrics.length > 0 ? (
                    parsedLyrics.map((lyric, index) => {
                      const { className } = getTextStyles(lyric.text);
                      const conditionalClass =
                        index === currentLyricIndex
                          ? "text-white"
                          : index === currentLyricIndex - 1 ||
                            index === currentLyricIndex + 1
                          ? "text-white/40"
                          : "text-white/40";

                      return (
                        <p
                          key={index}
                          className={`${className} ${conditionalClass}`}
                        >
                          {lyric.text}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-white text-[40px] font-[580] tracking-tight transition-colors duration-300">
                      Lyrics not available
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`px-12 ${!showTimeDisplay ? "pb-7 pt-3" : ""}`}>
          <ProgressBar
            progress={isSeeking ? localProgress : estimatedProgress}
            isPlaying={isPlaying}
            durationMs={currentPlayback?.item?.duration_ms}
            onSeek={async (position) => {
              try {
                setIsSeeking(true);
                const tempProgress =
                  (position / currentPlayback.item.duration_ms) * 100;
                setProgress(tempProgress);

                const seekUrl = `https://api.spotify.com/v1/me/player/seek?position_ms=${position}`;
                await fetch(seekUrl, {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                });

                setTimeout(async () => {
                  if (!currentPlayback?.is_playing) {
                    await togglePlayPause();
                  }

                  setTimeout(() => {
                    setIsSeeking(false);
                    fetchCurrentPlayback();
                  }, 200);
                }, 100);
              } catch (error) {
                handleError("SEEK_ERROR", error.message);
                setIsSeeking(false);
              }
            }}
            onPlayPause={togglePlayPause}
            onScrubbingChange={setIsProgressScrubbing}
            accessToken={accessToken}
            onProgressUpdate={setLiveProgress}
          />
        </div>

        {showTimeDisplay && (
          <div
            className={`w-full px-12 pb-1.5 pt-1.5 -mb-1.5 overflow-hidden transition-all duration-200 ease-in-out ${
              isProgressScrubbing
                ? "translate-y-24 opacity-0"
                : "translate-y-0 opacity-100"
            }`}
          >
            <div className="flex justify-between">
              {currentPlayback && currentPlayback.item ? (
                <>
                  <span className="text-white/60 text-[20px]">
                    {convertTimeToLength(
                      Math.floor(
                        (estimatedProgress / 100) *
                          currentPlayback.item.duration_ms
                      ),
                      true
                    )}
                  </span>
                  <span className="text-white/60 text-[20px]">
                    {remainingTimeEnabled
                      ? convertTimeToLength(
                          currentPlayback.item.duration_ms -
                            Math.floor(
                              (estimatedProgress / 100) *
                                currentPlayback.item.duration_ms
                            ),
                          false
                        )
                      : convertTimeToLength(
                          currentPlayback.item.duration_ms,
                          true
                        )}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-white/60 text-[20px]">--:--</span>
                  <span className="text-white/60 text-[20px]">--:--</span>
                </>
              )}
            </div>
          </div>
        )}

        <div
          className={`flex justify-between items-center w-full px-12 transition-all duration-200 ease-in-out ${
            isProgressScrubbing
              ? "translate-y-24 opacity-0"
              : "translate-y-0 opacity-100"
          }`}
        >
          <div className="flex-shrink-0" onClick={toggleLikeTrack}>
            {isLiked ? (
              <HeartIconFilled className="w-14 h-14" />
            ) : (
              <HeartIcon className="w-14 h-14" />
            )}
          </div>

          <div className="flex justify-center gap-12 flex-1">
            <div onClick={skipToPrevious}>
              <BackIcon className="w-14 h-14" />
            </div>
            <div onClick={togglePlayPause}>
              <PlayPauseButton />
            </div>
            <div onClick={skipToNext}>
              <ForwardIcon className="w-14 h-14" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentPlayback?.context?.uri ===
              "spotify:playlist:37i9dQZF1EYkqdzj48dyYq" && (
              <div onClick={handleDJSignal}>
                <DJIcon className="w-14 h-14 fill-white/60 mb-1 mr-2" />
              </div>
            )}
            <Menu as="div" className="relative inline-block text-left">
              <MenuButton className="focus:outline-none">
                <MenuIcon className="w-14 h-14 fill-white/60" />
              </MenuButton>

              <MenuItems
                transition
                className="absolute right-0 bottom-full z-10 mb-2 w-[22rem] origin-bottom-right divide-y divide-slate-100/25 bg-[#161616] rounded-[13px] shadow-xl transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
              >
                <div className="py-1">
                  <DrawerTrigger
                    onClick={(e) =>
                      currentPlayback ? setDrawerOpen(true) : e.preventDefault()
                    }
                  >
                    <MenuItem>
                      <div
                        className={`group flex items-center justify-between px-4 py-[16px] text-sm ${
                          currentPlayback ? "text-white" : "text-white/60"
                        } font-[560] tracking-tight`}
                      >
                        <span className="text-[28px]">Add to Playlist</span>
                        <PlaylistAddIcon
                          aria-hidden="true"
                          className="h-8 w-8 text-white/60"
                        />
                      </div>
                    </MenuItem>
                  </DrawerTrigger>
                </div>

                <div className="py-1">
                  <MenuItem onClick={() => setIsDeviceSwitcherOpen(true)}>
                    <div className="group flex items-center justify-between px-4 py-[16px] text-sm text-white font-[560] tracking-tight">
                      <span className="text-[28px]">Switch Device</span>
                      <DeviceSwitcherIcon
                        aria-hidden="true"
                        className="h-8 w-8 text-white/60"
                      />
                    </div>
                  </MenuItem>
                </div>

                <div className="py-1">
                  <MenuItem
                    onClick={(e) =>
                      currentPlayback ? toggleRepeat() : e.preventDefault()
                    }
                  >
                    <div
                      className={`group flex items-center justify-between px-4 py-[16px] text-sm ${
                        currentPlayback ? "text-white" : "text-white/60"
                      } font-[560] tracking-tight`}
                    >
                      <span className="text-[28px]">
                        {repeatMode === "off"
                          ? "Enable Repeat"
                          : repeatMode === "context"
                          ? "Enable Repeat One"
                          : "Disable Repeat"}
                      </span>
                      {repeatMode === "off" ? (
                        <RepeatIcon className="h-8 w-8 text-white/60" />
                      ) : repeatMode === "context" ? (
                        <RepeatIcon className="h-8 w-8 text-white" />
                      ) : (
                        <RepeatOneIcon className="h-8 w-8 text-white" />
                      )}
                    </div>
                  </MenuItem>
                </div>

                <div className="py-1">
                  <MenuItem
                    onClick={(e) =>
                      currentPlayback ? toggleShuffle() : e.preventDefault()
                    }
                  >
                    <div
                      className={`group flex items-center justify-between px-4 py-[16px] text-sm ${
                        currentPlayback ? "text-white" : "text-white/60"
                      } font-[560] tracking-tight`}
                    >
                      <span className="text-[28px]">
                        {isShuffled ? "Disable Shuffle" : "Enable Shuffle"}
                      </span>
                      <ShuffleIcon
                        aria-hidden="true"
                        className={`h-8 w-8 ${
                          isShuffled ? "text-white" : "text-white/60"
                        }`}
                      />
                    </div>
                  </MenuItem>
                </div>

                {lyricsMenuOptionEnabled && (
                  <div className="py-1">
                    <MenuItem
                      onClick={(e) =>
                        currentPlayback
                          ? handleToggleLyrics()
                          : e.preventDefault()
                      }
                    >
                      <div
                        className={`group flex items-center justify-between px-4 py-[16px] text-sm ${
                          currentPlayback ? "text-white" : "text-white/60"
                        } font-[560] tracking-tight`}
                      >
                        <span className="text-[28px]">
                          {showLyrics ? "Hide Lyrics" : "Show Lyrics"}
                        </span>
                        <LyricsIcon
                          aria-hidden="true"
                          className={`h-8 w-8 ${
                            showLyrics ? "text-white" : "text-white/60"
                          }`}
                        />
                      </div>
                    </MenuItem>
                  </div>
                )}
              </MenuItems>
            </Menu>
          </div>
        </div>

        {(isVolumeVisible || volume !== null) && (
          <div
            className={classNames(
              "fixed right-0 top-[70px] transform transition-opacity duration-300",
              {
                "opacity-0 volumeOutScale": !isVolumeVisible,
                "opacity-100 volumeInScale": isVolumeVisible,
              }
            )}
          >
            <div className="w-14 h-44 bg-slate-700/60 rounded-[17px] flex flex-col-reverse drop-shadow-xl overflow-hidden">
              <div
                className={classNames(
                  "bg-white w-full transition-height duration-300",
                  {
                    "rounded-b-[13px]": volume < 100,
                    "rounded-[13px]": volume === 100,
                  }
                )}
                style={{ height: `${volume ?? 100}%` }}
              >
                <div className="absolute bottom-0 left-0 right-0 flex justify-center items-center h-6 pb-7">
                  <VolumeIcon />
                </div>
              </div>
            </div>
          </div>
        )}

        <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <DrawerContent>
            <div className="mx-auto flex pl-8 pr-4 overflow-x-scroll scroll-container">
              {playlists.map((item) => (
                <div key={item.id} className="min-w-[280px] mr-10 mb-4">
                  <Redirect
                    href={`/playlist/${item.id}`}
                    accessToken={accessToken}
                  >
                    <div
                      onClick={async (e) => {
                        e.preventDefault();
                        await addTrackToPlaylist(item.id);
                        setDrawerOpen(false);
                      }}
                    >
                      <Image
                        src={
                          item?.images?.[0]?.url || "/images/not-playing.webp"
                        }
                        alt="Playlist Art"
                        width={280}
                        height={280}
                        className="mt-8 aspect-square rounded-[12px] drop-shadow-xl"
                      />
                      <h4 className="mt-2 text-[36px] font-[580] text-white truncate tracking-tight max-w-[280px]">
                        {item.name}
                      </h4>
                    </div>
                  </Redirect>
                </div>
              ))}
            </div>
          </DrawerContent>
        </Drawer>

        <Dialog open={open} onClose={handleClose} className="relative z-40">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-black/10 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
          />

          <div className="fixed inset-0 z-40 w-screen overflow-y-auto">
            <div
              className={`flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0 ${inter.variable}`}
              style={{ fontFamily: "var(--font-inter)" }}
            >
              <DialogPanel
                transition
                className="relative transform overflow-hidden rounded-[17px] bg-[#161616] px-0 pb-0 pt-5 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-[36rem] data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
              >
                <div>
                  <div className="text-center">
                    <DialogTitle
                      as="h3"
                      className="text-[36px] font-[560] tracking-tight text-white font-sans"
                    >
                      Already Added
                    </DialogTitle>
                    <div className="mt-2">
                      <p className="text-[28px] font-[560] tracking-tight text-white/60">
                        This track is already in the playlist.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-0 border-t border-slate-100/25">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="inline-flex w-full justify-center px-3 py-3 text-[28px] font-[560] tracking-tight text-[#6c8bd5] shadow-sm sm:col-start-2"
                  >
                    Don't Add
                  </button>
                  <button
                    type="button"
                    data-autofocus
                    onClick={handleAddAnyway}
                    className="mt-3 inline-flex w-full justify-center px-3 py-3 text-[28px] font-[560] tracking-tight text-[#fe3b30] shadow-sm sm:col-start-1 sm:mt-0 border-r border-slate-100/25"
                  >
                    Add Anyway
                  </button>
                </div>
              </DialogPanel>
            </div>
          </div>
        </Dialog>
      </div>
      <DeviceSwitcherModal
        isOpen={isDeviceSwitcherOpen}
        onClose={() => setIsDeviceSwitcherOpen(false)}
        accessToken={accessToken}
        handleError={handleError}
      />
    </>
  );
}
