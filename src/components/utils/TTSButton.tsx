import React, { useState } from "react";
import axios from "axios";
import { Button, Flex } from "@chakra-ui/react";
import { useLocalStorage } from "../../utils/lstore";
import { ELEVEN_TRANSCRIPTION_HISTORY } from "../../utils/constants";

interface TTSButtonProps {
  text: string;
  voiceID: string | null;
  apiKey: string;
}

export const TTSButton: React.FC<TTSButtonProps> = ({ text, voiceID, apiKey }) => {
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [transcriptionHistory, setTranscriptionHistory] = useLocalStorage<[]>(
    ELEVEN_TRANSCRIPTION_HISTORY
  );

  const findHistoryItem = () => {
    return transcriptionHistory
      ? // @ts-ignore
        transcriptionHistory.find((item) => item.text === text)
      : null;
  };

  const fetchAudioFromHistory = async (historyItemId: string) => {
    try {
      const response = await axios.get(
        `https://api.elevenlabs.io/v1/history/${historyItemId}/audio`,
        {
          responseType: "arraybuffer",
          headers: { "xi-api-key": apiKey },
        }
      );

      const blob = new Blob([response.data], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      setAudioSrc(url);
    } catch (error) {
      console.error("Error fetching audio from history:", error);
    }
  };

  const handleButtonClick = async () => {
    setIsLoading(true);

    const historyItem = findHistoryItem();
    if (historyItem) {
      // ! fix this.
      // @ts-ignore
      await fetchAudioFromHistory(historyItem.history_item_id);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceID}`,
        { text },
        {
          responseType: "arraybuffer",
          headers: { "xi-api-key": apiKey },
        }
      );

      const blob = new Blob([response.data], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      setAudioSrc(url);

      const historyResponse = await axios.get("https://api.elevenlabs.io/v1/history", {
        headers: { "xi-api-key": apiKey },
      });
      setTranscriptionHistory(historyResponse.data.history);
    } catch (error) {
      console.error("Error generating speech:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoadingSpinner = () => {
    if (isLoading) {
      return <span>Loading...</span>;
    }
    return null;
  };

  const buttonText = findHistoryItem() ? "Fetch Audio" : "Transcribe Audio";

  return (
    <Flex w="100%" justifyContent="center" mt={3}>
      {!audioSrc && (
        <Button onClick={handleButtonClick} disabled={isLoading} w="100%">
          {!isLoading ? buttonText : renderLoadingSpinner()}
        </Button>
      )}
      {audioSrc && (
        <audio controls src={audioSrc} style={{ width: "100%" }}>
          Your browser does not support the audio element.
        </audio>
      )}
    </Flex>
  );
};
