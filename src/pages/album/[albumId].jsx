import { useRouter } from "next/router";
import { useEffect, useState, useRef, useCallback } from "react";
import Redirect from "../../components/common/navigation/Redirect";
import TrackListNavigation from "../../components/common/navigation/TrackListNavigation";
import Image from "next/image";
import { getCurrentDevice } from "@/services/deviceService";
import { setPlaybackShuffleState } from "@/services/playerService";

export const runtime = "experimental-edge";

const AlbumPage = ({
  initialAlbum,
  updateGradientColors,
  currentlyPlayingTrackUri,
  handleError,
  error,
  setActiveSection,
}) => {
  const router = useRouter();
  const accessToken = router.query.accessToken;
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("shuffleEnabled") === "true";
    }
    return false;
  });
  const [album, setAlbum] = useState(initialAlbum);
  const [tracks, setTracks] = useState(initialAlbum.tracks.items);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    initialAlbum.tracks.total > initialAlbum.tracks.items.length
  );
  const observer = useRef();
  const tracksContainerRef = useRef(null);

  useEffect(() => {
    if (error) {
      handleError(error.type, error.message);
    }
  }, [error, handleError]);

  const lastTrackElementRef = useCallback(
    (node) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreTracks();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore]
  );

  useEffect(() => {
    if (album?.images && album.images.length > 0) {
      const albumImage = album.images[0].url;
      localStorage.setItem("albumPageImage", albumImage);
      updateGradientColors(albumImage);
    }

    return () => {
      updateGradientColors(null);
    };
  }, [album, updateGradientColors]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter") {
        playAlbum();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isShuffleEnabled]);

  useEffect(() => {
    void setPlaybackShuffleState(accessToken, handleError, setIsShuffleEnabled);
  }, [accessToken]);

  const loadMoreTracks = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    const offset = tracks.length;
    const limit = 25;

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/albums/${album.id}/tracks?offset=${offset}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch more tracks");
      }

      const data = await response.json();
      if (data.items.length === 0) {
        setHasMore(false);
      } else {
        setTracks((prevTracks) => [...prevTracks, ...data.items]);
        setHasMore(tracks.length + data.items.length < album.tracks.total);
      }
    } catch (error) {
      console.error("Error fetching more tracks:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const playAlbum = async () => {
    try {
      const device = await getCurrentDevice(accessToken, handleError);
      const activeDeviceId = device == null ? null : device.id;

      if (device && !device.is_active) {
        await fetch("https://api.spotify.com/v1/me/player", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            device_ids: [activeDeviceId],
            play: false,
          }),
        });
      }

      const savedShuffleState =
        localStorage.getItem("shuffleEnabled") === "true";

      await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=${savedShuffleState}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      let offset;
      if (savedShuffleState) {
        const randomPosition = Math.floor(Math.random() * album.tracks.total);
        offset = { position: randomPosition };
      } else {
        offset = { position: 0 };
      }

      await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context_uri: album.uri,
          offset: offset,
        }),
      });

      const savedRepeatState = localStorage.getItem("repeatMode") || "off";
      await fetch(
        `https://api.spotify.com/v1/me/player/repeat?state=${savedRepeatState}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setActiveSection("nowPlaying");
      router.push("/");
    } catch (error) {
      console.error("Error playing album:", error.message);
    }
  };

  const playTrack = async (trackUri, trackIndex) => {
    try {
      const device = await getCurrentDevice(accessToken, handleError);
      const activeDeviceId = device == null ? null : device.id;

      if (device && !device.is_active) {
        const transferResponse = await fetch(
          "https://api.spotify.com/v1/me/player",
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              device_ids: [activeDeviceId],
              play: false,
            }),
          }
        );

        if (!transferResponse.ok) {
          const errorData = await transferResponse.json();
          handleError("TRANSFER_PLAYBACK_ERROR", errorData.error.message);
          return;
        }
      }

      const savedShuffleState =
        localStorage.getItem("shuffleEnabled") === "true";
      await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=${savedShuffleState}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const playResponse = await fetch(
        "https://api.spotify.com/v1/me/player/play",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            context_uri: album.uri,
            offset: {
              uri: trackUri,
            },
            device_id: activeDeviceId,
          }),
        }
      );

      if (!playResponse.ok) {
        const errorData = await playResponse.json();
        console.error("Error playing track:", errorData.error.message);
      }

      const savedRepeatState = localStorage.getItem("repeatMode") || "off";
      await fetch(
        `https://api.spotify.com/v1/me/player/repeat?state=${savedRepeatState}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setActiveSection("nowPlaying");
      router.push("/");
    } catch (error) {
      console.error("Error playing track:", error.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 pt-10 px-12 fadeIn-animation">
      <div className="md:w-1/3 sticky top-10">
        {album.images && album.images.length > 0 ? (
          <div className="min-w-[280px] mr-10">
            <Image
              src={album.images[0].url || "/images/not-playing.webp"}
              alt="Album Cover"
              width={280}
              height={280}
              priority
              className="aspect-square rounded-[12px] drop-shadow-xl"
            />
            <h4 className="mt-2 text-[36px] font-[580] text-white truncate tracking-tight max-w-[280px]">
              {album.name}
            </h4>
            <Redirect
              href={`/artist/${album.artists[0].id}`}
              accessToken={accessToken}
            >
              <h4 className="text-[28px] font-[560] text-white/60 truncate tracking-tight max-w-[280px]">
                {album.artists.map((artist) => artist.name).join(", ")}
              </h4>
            </Redirect>
          </div>
        ) : (
          <p>No image available</p>
        )}
      </div>

      <div
        className="md:w-2/3 pl-20 h-[calc(100vh-5rem)] overflow-y-auto scroll-container scroll-smooth pb-12"
        ref={tracksContainerRef}
      >
        <TrackListNavigation
          tracks={tracks}
          containerRef={tracksContainerRef}
          accessToken={accessToken}
          currentlyPlayingTrackUri={currentlyPlayingTrackUri}
          playTrack={playTrack}
        />
        {tracks.map((track, index) => (
          <div
            key={track.id}
            ref={index === tracks.length - 1 ? lastTrackElementRef : null}
            className="flex gap-12 items-start mb-4 transition-transform duration-200 ease-out"
            style={{ transition: "transform 0.2s ease-out" }}
          >
            <div className="text-[32px] font-[580] text-center text-white/60 w-6 mt-3">
              {track.uri === currentlyPlayingTrackUri ? (
                <div className="w-5">
                  <section>
                    <div className="wave0"></div>
                    <div className="wave1"></div>
                    <div className="wave2"></div>
                    <div className="wave3"></div>
                  </section>
                </div>
              ) : (
                <p>{index + 1}</p>
              )}
            </div>

            <div className="flex-grow">
              <div onClick={() => playTrack(track.uri, index)}>
                <p className="text-[32px] font-[580] text-white truncate tracking-tight max-w-[280px]">
                  {track.name}
                </p>
              </div>
              <Redirect
                href={`/artist/${track.artists[0].id}`}
                accessToken={accessToken}
              >
                <p className="text-[28px] font-[560] text-white/60 truncate tracking-tight max-w-[280px]">
                  {track.artists.map((artist) => artist.name).join(", ")}
                </p>
              </Redirect>
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-center mt-4" />}
      </div>
    </div>
  );
};

export async function getServerSideProps(context) {
  const { albumId } = context.params;
  const accessToken = context.query.accessToken;

  try {
    const res = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      return {
        props: {
          error: {
            type: "FETCH_ALBUM_ERROR",
            message: errorData.error.message,
          },
          initialAlbum: null,
          accessToken,
        },
      };
    }

    const albumData = await res.json();
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=25`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const tracksData = await tracksRes.json();

    const initialAlbum = {
      ...albumData,
      tracks: {
        ...albumData.tracks,
        items: tracksData.items,
      },
    };

    return {
      props: { initialAlbum, accessToken, error: null },
    };
  } catch (error) {
    return {
      props: {
        error: {
          type: "FETCH_ALBUM_ERROR",
          message: error.message,
        },
        initialAlbum: null,
        accessToken,
      },
    };
  }
}

export default AlbumPage;
