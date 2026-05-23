import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

type Player = {
  id: string;
  name: string;
  board: number[];
};

type Winner = {
  playerId: string;
  lines: string[];
};

const BOARD_SIZE = 5;
const MAX_NUMBER = 25;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;
const NUMBERS = Array.from({ length: MAX_NUMBER }, (_, index) => index + 1);
const DEFAULT_PLAYER_NAMES = ["Blue Team", "Red Team"];

const WINNING_LINES = [
  ...Array.from({ length: BOARD_SIZE }, (_, row) => ({
    name: `Row ${row + 1}`,
    indexes: Array.from({ length: BOARD_SIZE }, (_, column) => row * BOARD_SIZE + column),
  })),
  ...Array.from({ length: BOARD_SIZE }, (_, column) => ({
    name: `Column ${column + 1}`,
    indexes: Array.from({ length: BOARD_SIZE }, (_, row) => row * BOARD_SIZE + column),
  })),
  {
    name: "Diagonal",
    indexes: Array.from({ length: BOARD_SIZE }, (_, index) => index * BOARD_SIZE + index),
  },
  {
    name: "Diagonal",
    indexes: Array.from({ length: BOARD_SIZE }, (_, index) => index * BOARD_SIZE + (BOARD_SIZE - 1 - index)),
  },
];

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 760;
  const [playerNames, setPlayerNames] = useState(DEFAULT_PLAYER_NAMES);
  const [players, setPlayers] = useState<Player[]>(() => createPlayers(DEFAULT_PLAYER_NAMES));
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [lastNumber, setLastNumber] = useState<number | null>(null);

  const calledSet = useMemo(() => new Set(calledNumbers), [calledNumbers]);
  const remainingCount = MAX_NUMBER - calledNumbers.length;
  const gameHasStarted = calledNumbers.length > 0;
  const hasWinner = winners.length > 0;
  const currentPlayer = players[currentPlayerIndex] ?? players[0];
  const winnerNames = winners
    .map((winner) => players.find((player) => player.id === winner.playerId)?.name)
    .filter(Boolean)
    .join(" and ");

  const updatePlayerName = (index: number, name: string) => {
    setPlayerNames((current) => current.map((playerName, playerIndex) => (playerIndex === index ? name : playerName)));
  };

  const addPlayer = () => {
    if (playerNames.length >= MAX_PLAYERS) {
      return;
    }

    setPlayerNames((current) => [...current, `Player ${current.length + 1}`]);
  };

  const removePlayer = (index: number) => {
    if (playerNames.length <= MIN_PLAYERS) {
      return;
    }

    setPlayerNames((current) => current.filter((_, playerIndex) => playerIndex !== index));
  };

  const startNewGame = () => {
    const cleanNames = playerNames.map((name, index) => name.trim() || `Player ${index + 1}`);
    setPlayerNames(cleanNames);
    setPlayers(createPlayers(cleanNames));
    setCalledNumbers([]);
    setCurrentPlayerIndex(0);
    setWinners([]);
    setLastNumber(null);
  };

  const callNumber = () => {
    if (hasWinner || remainingCount === 0) {
      return;
    }

    const availableNumbers = NUMBERS.filter((number) => !calledSet.has(number));
    const nextNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    const nextCalledNumbers = [...calledNumbers, nextNumber];
    const nextCalledSet = new Set(nextCalledNumbers);
    const nextWinners = players
      .map((player) => ({
        playerId: player.id,
        lines: getCompletedLines(player.board, nextCalledSet),
      }))
      .filter((winner) => winner.lines.length > 0);

    setCalledNumbers(nextCalledNumbers);
    setLastNumber(nextNumber);
    setWinners(nextWinners);

    if (nextWinners.length === 0 && availableNumbers.length > 1) {
      setCurrentPlayerIndex((current) => (current + 1) % players.length);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Classroom bingo</Text>
          <Text style={styles.title}>Take turns. Press the button. Find a line to win.</Text>
          <Text style={styles.subtitle}>
            A simple bingo game for children on phones, tablets, and classroom screens.
          </Text>
        </View>

        <View style={[styles.gamePanel, isWide ? styles.gamePanelWide : null]}>
          <View style={styles.turnCard}>
            <Text style={styles.cardLabel}>Current turn</Text>
            <Text style={styles.turnName}>{hasWinner ? "Game finished" : currentPlayer.name}</Text>
            <Text style={styles.turnHint}>
              {hasWinner
                ? `${winnerNames} ${winners.length === 1 ? "wins" : "win"}!`
                : gameHasStarted
                  ? "Pass the device after pressing the button."
                  : "Press Start Game when everyone is ready."}
            </Text>
          </View>

          <View style={styles.numberCard}>
            <Text style={styles.cardLabel}>Last number</Text>
            <View style={[styles.bigNumberBubble, hasWinner ? styles.winnerBubble : null]}>
              <Text style={styles.bigNumberText}>{lastNumber ?? "?"}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Call a bingo number"
              style={[
                styles.bingoButton,
                hasWinner || remainingCount === 0 ? styles.disabledButton : null,
              ]}
              onPress={callNumber}
              disabled={hasWinner || remainingCount === 0}
            >
              <Text style={styles.bingoButtonText}>{gameHasStarted ? "Bingo Button" : "Call first number"}</Text>
            </Pressable>
          </View>
        </View>

        {hasWinner ? (
          <View style={styles.winnerBanner}>
            <Text style={styles.winnerTitle}>BINGO!</Text>
            <Text style={styles.winnerText}>
              {winnerNames} {winners.length === 1 ? "completed" : "completed"} a line.
            </Text>
            <Pressable accessibilityRole="button" style={styles.resetButton} onPress={startNewGame}>
              <Text style={styles.resetButtonText}>Play again</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.setupCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Players</Text>
              <Text style={styles.helperText}>Add names, then start a fresh game board.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              style={[styles.smallButton, playerNames.length >= MAX_PLAYERS ? styles.disabledButton : null]}
              onPress={addPlayer}
              disabled={playerNames.length >= MAX_PLAYERS}
            >
              <Text style={styles.smallButtonText}>Add</Text>
            </Pressable>
          </View>

          <View style={styles.nameList}>
            {playerNames.map((name, index) => (
              <View key={`player-name-${index}`} style={styles.nameRow}>
                <TextInput
                  accessibilityLabel={`Player ${index + 1} name`}
                  autoCapitalize="words"
                  maxLength={18}
                  onChangeText={(nextName) => updatePlayerName(index, nextName)}
                  placeholder={`Player ${index + 1}`}
                  placeholderTextColor="#8a9a8e"
                  style={styles.nameInput}
                  value={name}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove player ${index + 1}`}
                  style={[styles.removeButton, playerNames.length <= MIN_PLAYERS ? styles.disabledButton : null]}
                  onPress={() => removePlayer(index)}
                  disabled={playerNames.length <= MIN_PLAYERS}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable accessibilityRole="button" style={styles.startButton} onPress={startNewGame}>
            <Text style={styles.startButtonText}>{gameHasStarted || hasWinner ? "Start new game" : "Start game"}</Text>
          </Pressable>
        </View>

        <View style={styles.calledCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Called numbers</Text>
              <Text style={styles.helperText}>{remainingCount} numbers left</Text>
            </View>
          </View>
          <View style={styles.calledGrid}>
            {NUMBERS.map((number) => {
              const wasCalled = calledSet.has(number);
              return (
                <View
                  key={number}
                  style={[
                    styles.calledNumber,
                    wasCalled ? styles.calledNumberActive : null,
                    lastNumber === number ? styles.calledNumberLatest : null,
                  ]}
                >
                  <Text style={[styles.calledNumberText, wasCalled ? styles.calledNumberTextActive : null]}>
                    {number}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.playerGrid, isWide ? styles.playerGridWide : null]}>
          {players.map((player) => {
            const playerWinner = winners.find((winner) => winner.playerId === player.id);
            const isCurrentPlayer = player.id === currentPlayer.id && !hasWinner;

            return (
              <View
                key={player.id}
                style={[
                  styles.playerCard,
                  isWide ? styles.playerCardWide : null,
                  isCurrentPlayer ? styles.currentPlayerCard : null,
                  playerWinner ? styles.winningPlayerCard : null,
                ]}
              >
                <View style={styles.playerHeader}>
                  <View>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerStatus}>
                      {playerWinner
                        ? `Winner: ${playerWinner.lines.join(", ")}`
                        : isCurrentPlayer
                          ? "Your turn"
                          : "Waiting"}
                    </Text>
                  </View>
                  {isCurrentPlayer ? <Text style={styles.turnBadge}>Turn</Text> : null}
                </View>

                <View style={styles.boardGrid}>
                  {player.board.map((number) => {
                    const isMarked = calledSet.has(number);
                    return (
                      <View key={`${player.id}-${number}`} style={[styles.boardCell, isMarked ? styles.markedCell : null]}>
                        <Text style={[styles.boardCellText, isMarked ? styles.markedCellText : null]}>{number}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createPlayers(names: string[]) {
  return names.map((name, index) => ({
    id: `player-${index + 1}-${Date.now()}`,
    name,
    board: shuffleNumbers(NUMBERS),
  }));
}

function shuffleNumbers(numbers: number[]) {
  const shuffled = [...numbers];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function getCompletedLines(board: number[], calledNumbers: Set<number>) {
  return WINNING_LINES.filter((line) => line.indexes.every((index) => calledNumbers.has(board[index]))).map(
    (line) => line.name,
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7fbf4",
  },
  content: {
    alignItems: "center",
    gap: 16,
    padding: 16,
    paddingBottom: 36,
  },
  hero: {
    maxWidth: 920,
    paddingTop: 12,
    width: "100%",
  },
  eyebrow: {
    color: "#3b7d56",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    color: "#183525",
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38,
  },
  subtitle: {
    color: "#52665a",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
  gamePanel: {
    gap: 14,
    maxWidth: 920,
    width: "100%",
  },
  gamePanelWide: {
    flexDirection: "row",
  },
  turnCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dfeadd",
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 190,
    padding: 20,
  },
  numberCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dfeadd",
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    minHeight: 190,
    padding: 20,
  },
  cardLabel: {
    color: "#6d8173",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  turnName: {
    color: "#183525",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 12,
  },
  turnHint: {
    color: "#5d7065",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  bigNumberBubble: {
    alignItems: "center",
    backgroundColor: "#e9f6e8",
    borderColor: "#bcdcbc",
    borderRadius: 48,
    borderWidth: 2,
    height: 96,
    justifyContent: "center",
    marginVertical: 14,
    width: 96,
  },
  winnerBubble: {
    backgroundColor: "#fff3bf",
    borderColor: "#f6c945",
  },
  bigNumberText: {
    color: "#183525",
    fontSize: 42,
    fontWeight: "900",
  },
  bingoButton: {
    alignItems: "center",
    backgroundColor: "#256f45",
    borderRadius: 999,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 28,
    width: "100%",
  },
  bingoButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.45,
  },
  winnerBanner: {
    alignItems: "center",
    backgroundColor: "#fff7d7",
    borderColor: "#f4d66b",
    borderRadius: 28,
    borderWidth: 2,
    maxWidth: 920,
    padding: 20,
    width: "100%",
  },
  winnerTitle: {
    color: "#77520d",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 1,
  },
  winnerText: {
    color: "#6c5b28",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  resetButton: {
    backgroundColor: "#183525",
    borderRadius: 999,
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  resetButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  setupCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dfeadd",
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: 920,
    padding: 16,
    width: "100%",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#183525",
    fontSize: 20,
    fontWeight: "900",
  },
  helperText: {
    color: "#6d8173",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  smallButton: {
    backgroundColor: "#e9f6e8",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  smallButtonText: {
    color: "#256f45",
    fontSize: 15,
    fontWeight: "900",
  },
  nameList: {
    gap: 10,
    marginTop: 14,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  nameInput: {
    backgroundColor: "#f7fbf4",
    borderColor: "#d6e5d3",
    borderRadius: 18,
    borderWidth: 1,
    color: "#183525",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    minHeight: 50,
    paddingHorizontal: 14,
  },
  removeButton: {
    backgroundColor: "#fff0e8",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  removeButtonText: {
    color: "#a34d25",
    fontSize: 13,
    fontWeight: "900",
  },
  startButton: {
    alignItems: "center",
    backgroundColor: "#183525",
    borderRadius: 999,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 52,
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  calledCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dfeadd",
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: 920,
    padding: 16,
    width: "100%",
  },
  calledGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  calledNumber: {
    alignItems: "center",
    backgroundColor: "#f0f5ee",
    borderColor: "transparent",
    borderRadius: 999,
    borderWidth: 2,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  calledNumberActive: {
    backgroundColor: "#256f45",
  },
  calledNumberLatest: {
    borderColor: "#f6c945",
  },
  calledNumberText: {
    color: "#718176",
    fontSize: 15,
    fontWeight: "900",
  },
  calledNumberTextActive: {
    color: "#ffffff",
  },
  playerGrid: {
    gap: 14,
    maxWidth: 920,
    width: "100%",
  },
  playerGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  playerCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dfeadd",
    borderRadius: 28,
    borderWidth: 2,
    padding: 14,
    width: "100%",
  },
  playerCardWide: {
    width: "48.4%",
  },
  currentPlayerCard: {
    borderColor: "#7dc78b",
  },
  winningPlayerCard: {
    backgroundColor: "#fff9df",
    borderColor: "#f6c945",
  },
  playerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  playerName: {
    color: "#183525",
    fontSize: 20,
    fontWeight: "900",
  },
  playerStatus: {
    color: "#66766c",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  turnBadge: {
    backgroundColor: "#e9f6e8",
    borderRadius: 999,
    color: "#256f45",
    fontSize: 13,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  boardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  boardCell: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: "#f7fbf4",
    borderColor: "#d6e5d3",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    width: "18%",
  },
  markedCell: {
    backgroundColor: "#256f45",
    borderColor: "#256f45",
  },
  boardCellText: {
    color: "#183525",
    fontSize: 18,
    fontWeight: "900",
  },
  markedCellText: {
    color: "#ffffff",
  },
});
