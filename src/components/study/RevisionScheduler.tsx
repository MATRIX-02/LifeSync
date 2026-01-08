// Revision Scheduler - Flashcards and Spaced Repetition

import { Alert } from "@/src/components/CustomAlert";
import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
import {
	Flashcard,
	FlashcardDeck,
	useStudyStore,
} from "@/src/context/studyStoreDB/index";
import { Theme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import {
	Dimensions,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

const { width } = Dimensions.get("window");

interface RevisionSchedulerProps {
	theme: Theme;
	onOpenDrawer?: () => void;
	subscriptionCheck?: SubscriptionCheckResult;
	currentMonthSessionCount: number;
}

const QUALITY_OPTIONS = [
	{ value: 0, label: "Forgot", color: "#dc2626", icon: "close-circle" },
	{ value: 1, label: "Hard", color: "#f97316", icon: "alert-circle" },
	{ value: 2, label: "Okay", color: "#eab308", icon: "remove-circle" },
	{ value: 3, label: "Good", color: "#22c55e", icon: "checkmark-circle" },
	{ value: 4, label: "Easy", color: "#3b82f6", icon: "star" },
];

export default function RevisionScheduler({
	theme,
	onOpenDrawer,
	subscriptionCheck,
	currentMonthSessionCount,
}: RevisionSchedulerProps) {
	const {
		studyGoals,
		subjects,
		flashcardDecks,
		flashcards,
		revisionSchedule,
		addFlashcardDeck,
		updateFlashcardDeck,
		deleteFlashcardDeck,
		addFlashcard,
		updateFlashcard,
		deleteFlashcard,
		reviewFlashcard,
		getCardsByDeck,
	} = useStudyStore();

	const styles = createStyles(theme);

	// View state
	const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
	const [reviewMode, setReviewMode] = useState(false);
	const [currentCardIndex, setCurrentCardIndex] = useState(0);
	const [showAnswer, setShowAnswer] = useState(false);

	// Modals
	const [showDeckModal, setShowDeckModal] = useState(false);
	const [showCardModal, setShowCardModal] = useState(false);
	const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
	const [editingCard, setEditingCard] = useState<Flashcard | null>(null);

	// Form state
	const [deckName, setDeckName] = useState("");
	const [deckDescription, setDeckDescription] = useState("");
	const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>();
	const [selectedSubjectId, setSelectedSubjectId] = useState<
		string | undefined
	>();
	const [cardFront, setCardFront] = useState("");
	const [cardBack, setCardBack] = useState("");
	const [cardTags, setCardTags] = useState("");

	const activeGoals = useMemo(
		() => studyGoals.filter((g) => g.status === "in_progress"),
		[studyGoals]
	);

	const goalSubjects = useMemo(() => {
		if (!selectedGoalId) return [];
		return subjects.filter((s) => s.goalId === selectedGoalId);
	}, [subjects, selectedGoalId]);

	// Get cards due for review
	const getDueCards = (deckId?: string) => {
		const now = new Date();
		return flashcards.filter((card) => {
			if (deckId && card.deckId !== deckId) return false;
			if (!card.nextReviewAt) return true;
			return new Date(card.nextReviewAt) <= now;
		});
	};

	const deckCards = useMemo(() => {
		if (!selectedDeck) return [];
		return flashcards.filter((c) => c.deckId === selectedDeck.id);
	}, [flashcards, selectedDeck]);

	const dueCards = useMemo(() => {
		if (!selectedDeck) return getDueCards();
		return getDueCards(selectedDeck.id);
	}, [flashcards, selectedDeck]);

	const currentCard = useMemo(() => {
		return dueCards[currentCardIndex];
	}, [dueCards, currentCardIndex]);

	const totalDueCards = useMemo(() => getDueCards().length, [flashcards]);

	const openAddDeck = () => {
		setEditingDeck(null);
		setDeckName("");
		setDeckDescription("");
		setSelectedGoalId(undefined);
		setSelectedSubjectId(undefined);
		setShowDeckModal(true);
	};

	const openEditDeck = (deck: FlashcardDeck) => {
		setEditingDeck(deck);
		setDeckName(deck.name);
		setDeckDescription(deck.description || "");
		setSelectedGoalId(deck.goalId);
		setSelectedSubjectId(deck.subjectId);
		setShowDeckModal(true);
	};

	const saveDeck = async () => {
		if (!deckName.trim()) {
			Alert.alert("Error", "Please enter a deck name");
			return;
		}

		const deckData = {
			name: deckName.trim(),
			description: deckDescription.trim() || undefined,
			goalId: selectedGoalId,
			subjectId: selectedSubjectId,
		};

		if (editingDeck) {
			await updateFlashcardDeck(editingDeck.id, deckData);
		} else {
			await addFlashcardDeck(deckData);
		}

		setShowDeckModal(false);
	};

	const confirmDeleteDeck = (deck: FlashcardDeck) => {
		Alert.alert(
			"Delete Deck",
			`Are you sure you want to delete "${deck.name}" and all its cards?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => deleteFlashcardDeck(deck.id),
				},
			]
		);
	};

	const openAddCard = () => {
		if (!selectedDeck) return;
		setEditingCard(null);
		setCardFront("");
		setCardBack("");
		setCardTags("");
		setShowCardModal(true);
	};

	const openEditCard = (card: Flashcard) => {
		setEditingCard(card);
		setCardFront(card.front);
		setCardBack(card.back);
		setCardTags(card.tags?.join(", ") || "");
		setShowCardModal(true);
	};

	const saveCard = async () => {
		if (!cardFront.trim() || !cardBack.trim()) {
			Alert.alert("Error", "Please enter both front and back of the card");
			return;
		}

		const tags = cardTags
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);

		const cardData = {
			front: cardFront.trim(),
			back: cardBack.trim(),
			tags: tags.length > 0 ? tags : undefined,
			deckId: selectedDeck!.id,
			difficulty: "medium" as const,
		};

		if (editingCard) {
			await updateFlashcard(editingCard.id, cardData);
		} else {
			await addFlashcard(cardData);
		}

		setShowCardModal(false);
	};

	const confirmDeleteCard = (card: Flashcard) => {
		Alert.alert("Delete Card", "Are you sure you want to delete this card?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => deleteFlashcard(card.id),
			},
		]);
	};

	const startReview = async (deck?: FlashcardDeck) => {
		if (deck) {
			setSelectedDeck(deck);
		}
		setReviewMode(true);
		setCurrentCardIndex(0);
		setShowAnswer(false);
	};

	const handleQualityRating = async (quality: number) => {
		if (!currentCard) return;

		// Convert quality (0-4) to boolean wasCorrect and difficulty
		const wasCorrect = quality >= 2;
		const difficulty =
			quality <= 1 ? "hard" : quality === 2 ? "medium" : "easy";
		await reviewFlashcard(currentCard.id, wasCorrect, difficulty);

		// Move to next card
		if (currentCardIndex < dueCards.length - 1) {
			setCurrentCardIndex((prev) => prev + 1);
			setShowAnswer(false);
		} else {
			// All cards reviewed
			setReviewMode(false);
			setCurrentCardIndex(0);
			Alert.alert(
				"Session Complete!",
				"You've reviewed all due cards. Great job! 🎉"
			);
		}
	};

	const getGoalForDeck = (deck: FlashcardDeck) => {
		if (!deck.goalId) return null;
		return studyGoals.find((g) => g.id === deck.goalId);
	};

	const getSubjectForDeck = (deck: FlashcardDeck) => {
		if (!deck.subjectId) return null;
		return subjects.find((s) => s.id === deck.subjectId);
	};

	if (reviewMode && currentCard) {
		return (
			<View style={styles.reviewContainer}>
				{/* Progress */}
				<View style={styles.reviewProgress}>
					<TouchableOpacity
						style={styles.exitReviewBtn}
						onPress={() => setReviewMode(false)}
					>
						<Ionicons name="close" size={24} color={theme.text} />
					</TouchableOpacity>
					<Text style={styles.reviewProgressText}>
						{currentCardIndex + 1} / {dueCards.length}
					</Text>
					<View style={styles.progressBar}>
						<View
							style={[
								styles.progressFill,
								{
									width: `${((currentCardIndex + 1) / dueCards.length) * 100}%`,
								},
							]}
						/>
					</View>
				</View>

				{/* Card */}
				<TouchableOpacity
					style={styles.flashcard}
					onPress={() => setShowAnswer(!showAnswer)}
					activeOpacity={0.9}
				>
					<View style={styles.cardSide}>
						<Text style={styles.cardLabel}>
							{showAnswer ? "Answer" : "Question"}
						</Text>
						<Text style={styles.cardText}>
							{showAnswer ? currentCard.back : currentCard.front}
						</Text>
						{!showAnswer && (
							<Text style={styles.tapHint}>Tap to reveal answer</Text>
						)}
					</View>
				</TouchableOpacity>

				{/* Rating */}
				{showAnswer && (
					<View style={styles.ratingContainer}>
						<Text style={styles.ratingLabel}>How well did you know this?</Text>
						<View style={styles.ratingButtons}>
							{QUALITY_OPTIONS.map((option) => (
								<TouchableOpacity
									key={option.value}
									style={[
										styles.ratingBtn,
										{ backgroundColor: option.color + "20" },
									]}
									onPress={() => handleQualityRating(option.value)}
								>
									<Ionicons
										name={option.icon as any}
										size={24}
										color={option.color}
									/>
									<Text style={[styles.ratingBtnText, { color: option.color }]}>
										{option.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
				)}
			</View>
		);
	}

	if (selectedDeck) {
		// Deck Detail View
		return (
			<View style={styles.container}>
				<View style={styles.deckDetailHeader}>
					<TouchableOpacity onPress={() => setSelectedDeck(null)}>
						<Ionicons name="arrow-back" size={24} color={theme.text} />
					</TouchableOpacity>
					<Text style={styles.deckDetailTitle}>{selectedDeck.name}</Text>
					<TouchableOpacity onPress={() => openEditDeck(selectedDeck)}>
						<Ionicons name="pencil" size={22} color={theme.primary} />
					</TouchableOpacity>
				</View>

				<View style={styles.deckStats}>
					<View style={styles.deckStatItem}>
						<Text style={styles.deckStatValue}>{deckCards.length}</Text>
						<Text style={styles.deckStatLabel}>Total Cards</Text>
					</View>
					<View style={styles.deckStatItem}>
						<Text style={[styles.deckStatValue, { color: theme.warning }]}>
							{getDueCards(selectedDeck.id).length}
						</Text>
						<Text style={styles.deckStatLabel}>Due Today</Text>
					</View>
					<View style={styles.deckStatItem}>
						<Text style={[styles.deckStatValue, { color: theme.success }]}>
							{deckCards.filter((c) => c.reviewCount > 0).length}
						</Text>
						<Text style={styles.deckStatLabel}>Learned</Text>
					</View>
				</View>

				{getDueCards(selectedDeck.id).length > 0 && (
					<TouchableOpacity
						style={styles.startReviewBtn}
						onPress={() => startReview(selectedDeck)}
					>
						<Ionicons name="play" size={22} color="#fff" />
						<Text style={styles.startReviewBtnText}>
							Review {getDueCards(selectedDeck.id).length} Cards
						</Text>
					</TouchableOpacity>
				)}

				<View style={styles.cardsHeader}>
					<Text style={styles.cardsTitle}>Cards</Text>
					<TouchableOpacity style={styles.addCardBtn} onPress={openAddCard}>
						<Ionicons name="add" size={20} color={theme.primary} />
						<Text style={styles.addCardBtnText}>Add Card</Text>
					</TouchableOpacity>
				</View>

				<ScrollView
					style={styles.cardsList}
					showsVerticalScrollIndicator={false}
				>
					{deckCards.length === 0 ? (
						<View style={styles.emptyCards}>
							<Ionicons
								name="albums-outline"
								size={48}
								color={theme.textMuted}
							/>
							<Text style={styles.emptyCardsText}>No cards yet</Text>
							<Text style={styles.emptyCardsSubtext}>
								Add your first flashcard to start learning
							</Text>
						</View>
					) : (
						deckCards.map((card) => (
							<TouchableOpacity
								key={card.id}
								style={styles.cardItem}
								onPress={() => openEditCard(card)}
							>
								<View style={styles.cardItemContent}>
									<Text style={styles.cardItemFront} numberOfLines={2}>
										{card.front}
									</Text>
									<Text style={styles.cardItemBack} numberOfLines={1}>
										{card.back}
									</Text>
								</View>
								<View style={styles.cardItemMeta}>
									{card.nextReviewAt && (
										<Text style={styles.cardItemReview}>
											Next: {new Date(card.nextReviewAt).toLocaleDateString()}
										</Text>
									)}
									<TouchableOpacity
										onPress={() => confirmDeleteCard(card)}
										hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
									>
										<Ionicons
											name="trash-outline"
											size={18}
											color={theme.error}
										/>
									</TouchableOpacity>
								</View>
							</TouchableOpacity>
						))
					)}
					<View style={{ height: 100 }} />
				</ScrollView>

				{/* Add/Edit Card Modal */}
				<Modal visible={showCardModal} animationType="slide" transparent>
					<View style={styles.modalOverlay}>
						<View style={styles.modalContent}>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>
									{editingCard ? "Edit Card" : "New Card"}
								</Text>
								<TouchableOpacity onPress={() => setShowCardModal(false)}>
									<Ionicons name="close" size={24} color={theme.text} />
								</TouchableOpacity>
							</View>

							<ScrollView showsVerticalScrollIndicator={false}>
								<Text style={styles.inputLabel}>Question (Front)</Text>
								<TextInput
									style={[styles.input, styles.multilineInput]}
									value={cardFront}
									onChangeText={setCardFront}
									placeholder="What is..."
									placeholderTextColor={theme.textMuted}
									multiline
								/>

								<Text style={styles.inputLabel}>Answer (Back)</Text>
								<TextInput
									style={[styles.input, styles.multilineInput]}
									value={cardBack}
									onChangeText={setCardBack}
									placeholder="The answer is..."
									placeholderTextColor={theme.textMuted}
									multiline
								/>

								<Text style={styles.inputLabel}>Tags (comma separated)</Text>
								<TextInput
									style={styles.input}
									value={cardTags}
									onChangeText={setCardTags}
									placeholder="chapter1, important, formula"
									placeholderTextColor={theme.textMuted}
								/>

								<TouchableOpacity
									style={styles.submitButton}
									onPress={saveCard}
								>
									<Text style={styles.submitButtonText}>
										{editingCard ? "Save Changes" : "Add Card"}
									</Text>
								</TouchableOpacity>
							</ScrollView>
						</View>
					</View>
				</Modal>
			</View>
		);
	}

	// Main Deck List View
	return (
		<View style={styles.container}>
			{/* Quick Review Banner */}
			{totalDueCards > 0 && (
				<TouchableOpacity
					style={styles.quickReviewBanner}
					onPress={() => startReview()}
				>
					<View style={styles.bannerLeft}>
						<Ionicons name="flash" size={24} color="#fff" />
						<View>
							<Text style={styles.bannerTitle}>
								{totalDueCards} cards due for review
							</Text>
							<Text style={styles.bannerSubtitle}>
								Start a quick review session
							</Text>
						</View>
					</View>
					<Ionicons name="play" size={24} color="#fff" />
				</TouchableOpacity>
			)}

			<View style={{ ...styles.header, marginTop: 16 }}>
				<Text style={styles.headerTitle}>Flashcard Decks</Text>
				<TouchableOpacity style={styles.addBtn} onPress={openAddDeck}>
					<Ionicons name="add" size={24} color="#fff" />
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.deckList} showsVerticalScrollIndicator={false}>
				{flashcardDecks.length === 0 ? (
					<View style={styles.emptyState}>
						<Ionicons
							name="library-outline"
							size={64}
							color={theme.textMuted}
						/>
						<Text style={styles.emptyTitle}>No Flashcard Decks</Text>
						<Text style={styles.emptySubtitle}>
							Create your first deck to start building your knowledge
						</Text>
						<TouchableOpacity style={styles.emptyButton} onPress={openAddDeck}>
							<Ionicons name="add" size={20} color="#fff" />
							<Text style={styles.emptyButtonText}>Create Deck</Text>
						</TouchableOpacity>
					</View>
				) : (
					flashcardDecks.map((deck) => {
						const goal = getGoalForDeck(deck);
						const subject = getSubjectForDeck(deck);
						const deckDueCount = getDueCards(deck.id).length;
						const totalCards = flashcards.filter(
							(c) => c.deckId === deck.id
						).length;

						return (
							<TouchableOpacity
								key={deck.id}
								style={styles.deckCard}
								onPress={() => {
									setSelectedDeck(deck);
								}}
							>
								<View style={styles.deckCardHeader}>
									<View style={styles.deckCardLeft}>
										<Ionicons
											name="albums"
											size={28}
											color={subject?.color || goal?.color || theme.primary}
										/>
										<View>
											<Text style={styles.deckCardName}>{deck.name}</Text>
											{(goal || subject) && (
												<Text style={styles.deckCardMeta}>
													{goal?.name}
													{goal && subject && " • "}
													{subject?.name}
												</Text>
											)}
										</View>
									</View>
									<TouchableOpacity
										onPress={() => confirmDeleteDeck(deck)}
										hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
									>
										<Ionicons
											name="trash-outline"
											size={20}
											color={theme.error}
										/>
									</TouchableOpacity>
								</View>

								<View style={styles.deckCardStats}>
									<View style={styles.deckCardStat}>
										<Text style={styles.deckCardStatValue}>{totalCards}</Text>
										<Text style={styles.deckCardStatLabel}>Cards</Text>
									</View>
									{deckDueCount > 0 && (
										<View style={[styles.deckCardStat, styles.dueStat]}>
											<Text
												style={[
													styles.deckCardStatValue,
													{ color: theme.warning },
												]}
											>
												{deckDueCount}
											</Text>
											<Text style={styles.deckCardStatLabel}>Due</Text>
										</View>
									)}
								</View>

								{deckDueCount > 0 && (
									<TouchableOpacity
										style={styles.reviewDeckBtn}
										onPress={(e) => {
											e.stopPropagation();
											startReview(deck);
										}}
									>
										<Ionicons name="play" size={16} color="#fff" />
										<Text style={styles.reviewDeckBtnText}>Review Now</Text>
									</TouchableOpacity>
								)}
							</TouchableOpacity>
						);
					})
				)}
				<View style={{ height: 100 }} />
			</ScrollView>

			{/* Add/Edit Deck Modal */}
			<Modal visible={showDeckModal} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{editingDeck ? "Edit Deck" : "New Deck"}
							</Text>
							<TouchableOpacity onPress={() => setShowDeckModal(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							<Text style={styles.inputLabel}>Deck Name *</Text>
							<TextInput
								style={styles.input}
								value={deckName}
								onChangeText={setDeckName}
								placeholder="e.g., Physics Chapter 1"
								placeholderTextColor={theme.textMuted}
							/>

							<Text style={styles.inputLabel}>Description</Text>
							<TextInput
								style={[styles.input, styles.multilineInput]}
								value={deckDescription}
								onChangeText={setDeckDescription}
								placeholder="What's this deck about?"
								placeholderTextColor={theme.textMuted}
								multiline
							/>

							<Text style={styles.inputLabel}>Link to Goal (Optional)</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								<TouchableOpacity
									style={[
										styles.goalOption,
										!selectedGoalId && styles.goalOptionActive,
									]}
									onPress={() => {
										setSelectedGoalId(undefined);
										setSelectedSubjectId(undefined);
									}}
								>
									<Text
										style={[
											styles.goalOptionText,
											!selectedGoalId && styles.goalOptionTextActive,
										]}
									>
										No Goal
									</Text>
								</TouchableOpacity>
								{activeGoals.map((goal) => (
									<TouchableOpacity
										key={goal.id}
										style={[
											styles.goalOption,
											selectedGoalId === goal.id && styles.goalOptionActive,
										]}
										onPress={() => {
											setSelectedGoalId(goal.id);
											setSelectedSubjectId(undefined);
										}}
									>
										<View
											style={[
												styles.goalDot,
												{ backgroundColor: goal.color || theme.primary },
											]}
										/>
										<Text
											style={[
												styles.goalOptionText,
												selectedGoalId === goal.id &&
													styles.goalOptionTextActive,
											]}
										>
											{goal.name}
										</Text>
									</TouchableOpacity>
								))}
							</ScrollView>

							{goalSubjects.length > 0 && (
								<>
									<Text style={styles.inputLabel}>
										Link to Subject (Optional)
									</Text>
									<View style={styles.subjectGrid}>
										{goalSubjects.map((subject) => (
											<TouchableOpacity
												key={subject.id}
												style={[
													styles.subjectOption,
													selectedSubjectId === subject.id &&
														styles.subjectOptionActive,
												]}
												onPress={() => setSelectedSubjectId(subject.id)}
											>
												<Ionicons
													name={(subject.icon as any) || "book"}
													size={18}
													color={
														selectedSubjectId === subject.id
															? "#fff"
															: subject.color || theme.text
													}
												/>
												<Text
													style={[
														styles.subjectOptionText,
														selectedSubjectId === subject.id &&
															styles.subjectOptionTextActive,
													]}
												>
													{subject.name}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								</>
							)}

							<TouchableOpacity style={styles.submitButton} onPress={saveDeck}>
								<Text style={styles.submitButtonText}>
									{editingDeck ? "Save Changes" : "Create Deck"}
								</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		// Quick Review Banner
		quickReviewBanner: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: theme.primary,
			margin: 16,
			padding: 16,
			borderRadius: 16,
		},
		bannerLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		bannerTitle: {
			fontSize: 16,
			fontWeight: "700",
			color: "#fff",
		},
		bannerSubtitle: {
			fontSize: 13,
			color: "rgba(255,255,255,0.8)",
		},
		// Header
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 16,
			marginBottom: 16,
		},
		headerTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		addBtn: {
			backgroundColor: theme.primary,
			width: 40,
			height: 40,
			borderRadius: 20,
			justifyContent: "center",
			alignItems: "center",
		},
		// Deck List
		deckList: {
			flex: 1,
			paddingHorizontal: 16,
		},
		deckCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			marginBottom: 12,
		},
		deckCardHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
		},
		deckCardLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			flex: 1,
		},
		deckCardName: {
			fontSize: 17,
			fontWeight: "600",
			color: theme.text,
		},
		deckCardMeta: {
			fontSize: 13,
			color: theme.textSecondary,
			marginTop: 2,
		},
		deckCardStats: {
			flexDirection: "row",
			gap: 20,
			marginTop: 16,
		},
		deckCardStat: {},
		dueStat: {
			backgroundColor: theme.warning + "20",
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 8,
		},
		deckCardStatValue: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		deckCardStatLabel: {
			fontSize: 12,
			color: theme.textSecondary,
		},
		reviewDeckBtn: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			backgroundColor: theme.primary,
			paddingVertical: 10,
			borderRadius: 10,
			marginTop: 12,
		},
		reviewDeckBtnText: {
			fontSize: 14,
			fontWeight: "600",
			color: "#fff",
		},
		// Empty State
		emptyState: {
			alignItems: "center",
			paddingVertical: 60,
		},
		emptyTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
			marginTop: 20,
		},
		emptySubtitle: {
			fontSize: 15,
			color: theme.textSecondary,
			marginTop: 8,
			textAlign: "center",
			paddingHorizontal: 40,
		},
		emptyButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			backgroundColor: theme.primary,
			paddingHorizontal: 24,
			paddingVertical: 12,
			borderRadius: 12,
			marginTop: 24,
		},
		emptyButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: "#fff",
		},
		// Deck Detail
		deckDetailHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			padding: 16,
		},
		deckDetailTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			flex: 1,
			textAlign: "center",
		},
		deckStats: {
			flexDirection: "row",
			justifyContent: "space-around",
			backgroundColor: theme.surface,
			marginHorizontal: 16,
			padding: 16,
			borderRadius: 16,
		},
		deckStatItem: {
			alignItems: "center",
		},
		deckStatValue: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
		},
		deckStatLabel: {
			fontSize: 12,
			color: theme.textSecondary,
		},
		startReviewBtn: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 10,
			backgroundColor: theme.primary,
			marginHorizontal: 16,
			marginTop: 16,
			paddingVertical: 14,
			borderRadius: 12,
		},
		startReviewBtnText: {
			fontSize: 16,
			fontWeight: "700",
			color: "#fff",
		},
		cardsHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: 16,
		},
		cardsTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		addCardBtn: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		addCardBtnText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.primary,
		},
		cardsList: {
			flex: 1,
			paddingHorizontal: 16,
		},
		emptyCards: {
			alignItems: "center",
			paddingVertical: 40,
		},
		emptyCardsText: {
			fontSize: 17,
			fontWeight: "600",
			color: theme.text,
			marginTop: 16,
		},
		emptyCardsSubtext: {
			fontSize: 14,
			color: theme.textSecondary,
			marginTop: 4,
		},
		cardItem: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 14,
			marginBottom: 10,
		},
		cardItemContent: {},
		cardItemFront: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		cardItemBack: {
			fontSize: 13,
			color: theme.textSecondary,
			marginTop: 4,
		},
		cardItemMeta: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginTop: 10,
		},
		cardItemReview: {
			fontSize: 12,
			color: theme.textMuted,
		},
		// Review Mode
		reviewContainer: {
			flex: 1,
			backgroundColor: theme.background,
		},
		reviewProgress: {
			padding: 16,
		},
		exitReviewBtn: {
			marginBottom: 10,
		},
		reviewProgressText: {
			fontSize: 14,
			color: theme.textSecondary,
			marginBottom: 8,
		},
		progressBar: {
			height: 6,
			backgroundColor: theme.border,
			borderRadius: 3,
		},
		progressFill: {
			height: 6,
			backgroundColor: theme.primary,
			borderRadius: 3,
		},
		flashcard: {
			flex: 1,
			margin: 16,
			backgroundColor: theme.surface,
			borderRadius: 20,
			justifyContent: "center",
			alignItems: "center",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.1,
			shadowRadius: 12,
			elevation: 5,
		},
		cardSide: {
			padding: 30,
			alignItems: "center",
		},
		cardLabel: {
			fontSize: 14,
			color: theme.textMuted,
			marginBottom: 20,
		},
		cardText: {
			fontSize: 22,
			fontWeight: "600",
			color: theme.text,
			textAlign: "center",
			lineHeight: 32,
		},
		tapHint: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 40,
		},
		ratingContainer: {
			padding: 20,
		},
		ratingLabel: {
			fontSize: 15,
			color: theme.textSecondary,
			textAlign: "center",
			marginBottom: 16,
		},
		ratingButtons: {
			flexDirection: "row",
			justifyContent: "space-around",
		},
		ratingBtn: {
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 10,
			borderRadius: 12,
			minWidth: 60,
		},
		ratingBtnText: {
			fontSize: 12,
			fontWeight: "600",
			marginTop: 4,
		},
		// Modal
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		modalContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			padding: 20,
			maxHeight: "80%",
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 20,
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		inputLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
			marginTop: 16,
		},
		input: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 14,
			fontSize: 16,
			color: theme.text,
		},
		multilineInput: {
			minHeight: 100,
			textAlignVertical: "top",
		},
		goalOption: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderRadius: 20,
			backgroundColor: theme.surface,
			marginRight: 10,
			borderWidth: 2,
			borderColor: "transparent",
		},
		goalOptionActive: {
			borderColor: theme.primary,
		},
		goalDot: {
			width: 10,
			height: 10,
			borderRadius: 5,
		},
		goalOptionText: {
			fontSize: 14,
			color: theme.text,
		},
		goalOptionTextActive: {
			fontWeight: "600",
		},
		subjectGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 10,
		},
		subjectOption: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 14,
			paddingVertical: 10,
			borderRadius: 10,
			backgroundColor: theme.surface,
		},
		subjectOptionActive: {
			backgroundColor: theme.primary,
		},
		subjectOptionText: {
			fontSize: 14,
			color: theme.text,
		},
		subjectOptionTextActive: {
			color: "#fff",
		},
		submitButton: {
			backgroundColor: theme.primary,
			padding: 16,
			borderRadius: 12,
			alignItems: "center",
			marginTop: 24,
			marginBottom: 20,
		},
		submitButtonText: {
			color: "#fff",
			fontSize: 16,
			fontWeight: "700",
		},
	});
