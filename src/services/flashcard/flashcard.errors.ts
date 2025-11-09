/**
 * Błąd walidacji karty
 */
export class FlashcardValidationError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message);
    this.name = "FlashcardValidationError";
  }
}

/**
 * Błąd - sesja generowania nie znaleziona lub należy do innego użytkownika
 */
export class GenerationNotFoundError extends Error {
  constructor(generationId: number) {
    super(`Generation ${generationId} not found`);
    this.name = "GenerationNotFoundError";
  }
}

/**
 * Błąd - sesja generowania jest zamknięta
 */
export class GenerationClosedError extends Error {
  constructor(generationId: number) {
    super(`Generation ${generationId} is already closed`);
    this.name = "GenerationClosedError";
  }
}

/**
 * Błąd - kolekcja nie znaleziona
 */
export class CollectionNotFoundError extends Error {
  constructor(collectionId: number) {
    super(`Collection ${collectionId} not found`);
    this.name = "CollectionNotFoundError";
  }
}

/**
 * Błąd - brak dostępu do kolekcji (403)
 */
export class CollectionAccessError extends Error {
  constructor() {
    super("Access denied to this collection");
    this.name = "CollectionAccessError";
  }
}

/**
 * Błąd - usługa scheduler niedostępna
 */
export class SchedulerError extends Error {
  constructor(message = "Scheduler service unavailable") {
    super(message);
    this.name = "SchedulerError";
  }
}
