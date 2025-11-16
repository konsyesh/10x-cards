# Dokument wymagań produktu (PRD) - 10x-Cards

## 1. Przegląd produktu

10x-Cards to webowa aplikacja do szybkiego tworzenia i nauki fiszek z wykorzystaniem algorytmu powtórek. Rozwiązuje problem czasochłonnego, ręcznego przygotowywania materiałów, umożliwiając generowanie kandydatów fiszek z wklejonego tekstu w języku polskim i prosty proces akceptacji.

Zakres MVP

- Generowanie kandydatów fiszek przez AI z wejścia 1 000–50 000 znaków (PL → PL).
- Manualne dodawanie fiszek.
- Przeglądanie, wyszukiwanie, edycja i usuwanie fiszek.
- Prosty system kont użytkowników i przechowywania danych.
- Integracja z gotowym open-source schedulerem spaced repetition.
- Analityka niezbędna do pomiaru AI-acceptance rate i AI-usage rate.

Użytkownicy docelowi

- Osoby samodzielnie uczące się faktów i pojęć, korzystające z własnych materiałów.
- Przykłady: studenci, specjaliści przygotowujący się do certyfikacji, osoby uczące się języka.

Założenia

- Język interfejsu i treści fiszek: polski (MVP).
- Architektura gotowa na rozszerzenie o kolejne języki.
- Brak limitów kosztowych po stronie użytkownika w MVP; monitorowanie kosztów po stronie systemu.

Cele biznesowe

- Zwiększenie adopcji metody spaced repetition dzięki skróceniu czasu przygotowania fiszek.
- Walidacja jakości generacji AI poprzez akceptację użytkowników.

## 2. Problem użytkownika

Ból i potrzeby

- Przygotowanie dobrych fiszek z długich materiałów zabiera dużo czasu.
- Brak prostego narzędzia, które łączy generację, kontrolę jakości i natychmiastowe włączenie do powtórek.
- Użytkownicy chcą mieć kontrolę nad treścią (akceptacja/edycja/odrzucanie) bez zbędnych kroków.

Jobs to be done

- Gdy mam materiał do nauki, chcę szybko otrzymać trafne fiszki, żebym mógł uczyć się jeszcze tego samego dnia.
- Gdy przeglądam kandydatów, chcę prosto edytować i zbiorczo zapisać, aby zachować tempo pracy.
- Gdy uczę się, chcę mieć fiszki od razu w harmonogramie powtórek, aby nie tracić rytmu nauki.

Ograniczenia i kontekst

- Wejściowy tekst może być krótki lub długi (1k–50k znaków).
- Fiszki są tekstowe: przód do 200 znaków, tył do 500 znaków.
- Brak mobilnych aplikacji; web responsywny.

## 3. Wymagania funkcjonalne

FR-01 Generowanie kandydatów fiszek z wklejonego tekstu (PL → PL) w zakresie 1 000–50 000 znaków.
FR-02 Interfejs recenzji kandydatów: listowanie, paginacja, akcje Accept, Edit, Reject; edycja inline obu pól.
FR-03 Zbiorcze zapisanie wyłącznie zaakceptowanych kandydatów do bazy.
FR-04 Walidacja pól karty: przód ≤ 200 znaków, tył ≤ 500 znaków; komunikaty błędów w czasie edycji.
FR-05 Manualne tworzenie pojedynczej fiszki przez formularz front/back z tą samą walidacją.
FR-06 Lista zapisanych fiszek: przeglądanie, proste wyszukiwanie pełnotekstowe, sortowanie, edycja, usuwanie.
FR-07 Konta użytkowników: rejestracja, logowanie, wylogowanie, reset hasła; auth i autoryzacja per użytkownik.
FR-08 Integracja z open-source schedulerem spaced repetition; automatyczne przypisanie nowo zapisanych fiszek do harmonogramu.
FR-09 Sesja nauki: pobieranie fiszek przeznaczonych na dziś z algorytmu; rejestracja odpowiedzi użytkownika; aktualizacja schedulerem.
FR-10 Analityka czasu rzeczywistego: rejestrowanie liczby wygenerowanych kandydatów, decyzji Accept/Edit/Reject oraz zapisów; obliczanie AI-acceptance rate i AI-usage rate.
FR-11 Ochrona danych i RODO: HTTPS, szyfrowanie danych w spoczynku, prawo do usunięcia konta i danych; RLS dla danych użytkownika.
FR-12 Ograniczenia i obsługa błędów: komunikaty dla wejścia <1k lub >50k znaków, błędy generacji AI, timeouty, ponawianie próby.
FR-13 Zachowanie stanu recenzji do czasu zapisu: ostrzeżenie przy próbie opuszczenia strony z niezapisanymi zmianami.
FR-14 Dziennik audytu minimalny: kto i kiedy stworzył, edytował, usunął fiszkę; bez wrażliwych treści w logach.
FR-15 Skalowalność językowa: warstwa i18n przygotowana do rozszerzenia (klucze tekstów UI, locale).
FR-16 Monitorowanie kosztów LLM po stronie systemu i alerty przekroczeń progów (bez wpływu na UX użytkownika w MVP).
FR-17 Zgodność przeglądarek: ostatnie dwie wersje Chrome, Firefox, Edge, Safari; RWD dla widoków desktop/mobile-web.
FR-18 Dostępność podstawowa: nawigacja klawiaturą, kontrast, etykiety ARIA dla kluczowych elementów.
FR-19 Usuwanie konta: potwierdzenie i nieodwracalne usunięcie konta wraz z fiszkami i danymi powtórek.

Niefunkcjonalne (wybrane)

- Wydajność: generacja kandydatów dla 10k znaków powinna zakończyć się w akceptowalnym czasie interakcji (np. do 60 s) z wskaźnikiem postępu.
- Niezawodność: utrata połączenia podczas recenzji nie powinna powodować utraty zaakceptowanych zmian do chwili zapisu lokalnego (local state).
- Bezpieczeństwo: hasła haszowane, bez plaintextu; ochrona przed CSRF/XSS; rate limiting dla endpointów generacji.
- Prywatność: brak trenowania modeli na danych użytkownika w MVP.

## 4. Granice produktu

Poza zakresem MVP

- Zaawansowany, własny algorytm powtórek; pozostajemy przy open-source schedulerze.
- Import plików w formatach innych niż czysty tekst (PDF, DOCX itp.).
- Współdzielenie i publikowanie zestawów.
- Integracje z zewnętrznymi platformami edukacyjnymi.
- Aplikacje mobilne natywne.

Ograniczenia techniczne

- Treści i UI wyłącznie w języku polskim na start.
- Treści fiszek wyłącznie tekstowe; brak obrazów/multimediów.
- Wejście 1 000–50 000 znaków; wejście spoza zakresu odrzucane z komunikatem.
- Brak limitów kosztowych po stronie użytkownika; limity i alerty techniczne po stronie systemu.

Zależności

- Dostępność LLM do generacji kandydatów.
- Wybrany, kompatybilny licencyjnie scheduler spaced repetition.
- Usługi infrastruktury: baza danych z RLS, storage, system autoryzacji, analityka.

Ryzyka

- Ryzyko jakości generacji skutkujące niższym AI-acceptance rate.
- Ryzyko kosztów LLM przy długich wejściach.
- Ryzyko zgodności z RODO (należy zapewnić proces usuwania danych i politykę prywatności).

## 5. Historyjki użytkowników

US-001 Rejestracja konta
Opis: Jako nowy użytkownik chcę utworzyć konto, aby moje fiszki były bezpiecznie przechowywane i dostępne po zalogowaniu.
Kryteria akceptacji:

- Formularz rejestracji wymaga e-maila i hasła, waliduje poprawność e-maila i siłę hasła.
- Po sukcesie użytkownik zostaje zalogowany lub otrzymuje link aktywacyjny (w zależności od konfiguracji).
- Błąd przy istniejącym e-mailu wyświetla czytelny komunikat.

US-002 Logowanie
Opis: Jako użytkownik chcę się zalogować, aby uzyskać dostęp funkcji generowania.
Kryteria akceptacji:

- Logowanie wymaga e-maila i hasła.
- Błędne dane pokazują komunikat bez ujawniania, które pole jest niepoprawne.
- Po zalogowaniu następuje przekierowanie do pulpitu /generate

US-003 Reset hasła
Opis: Jako użytkownik, który zapomniał hasła, chcę je zresetować, aby odzyskać dostęp.
Kryteria akceptacji:

- Formularz resetu przyjmuje e-mail i wysyła link resetujący.
- Link działa jednorazowo i wygasa.
- Po ustawieniu nowego hasła można się zalogować.

US-004 Wylogowanie
Opis: Jako użytkownik chcę się wylogować, aby zakończyć bezpiecznie sesję.
Kryteria akceptacji:

- Kliknięcie Wyloguj kończy sesję i przenosi na stronę logowania.
- Tokeny sesyjne są unieważniane.

US-005 Wklejenie tekstu do generacji
Opis: Jako użytkownik chcę wkleić tekst 1 000–50 000 znaków, aby AI wygenerowała kandydatów fiszek.
Kryteria akceptacji:

- Pole wejściowe podaje licznik znaków i informuje o zakresie.
- Wejście spoza zakresu blokuje przycisk Generuj i wyświetla komunikat.
- Po uruchomieniu widoczny jest wskaźnik postępu i możliwość anulowania.

US-006 Otrzymanie kandydatów fiszek
Opis: Jako użytkownik chcę zobaczyć listę kandydatów z podziałem na strony, aby móc je przeglądać.
Kryteria akceptacji:

- Lista zawiera pola przód i tył każdej karty.
- Paginuje się przy dużej liczbie kandydatów.
- Pojawia się podsumowanie: liczba kandydatów.

US-007 Akceptacja kandydata
Opis: Jako użytkownik chcę zaakceptować wybranego kandydata, aby dodać go do zestawu zapisu zbiorczego.
Kryteria akceptacji:

- Kliknięcie Accept oznacza kartę jako zaakceptowaną i dodaje do liczby do zapisu.
- Oznaczenie jest widoczne i odwracalne do czasu zapisu.

US-008 Edycja kandydata
Opis: Jako użytkownik chcę edytować przód/tył kandydata przed akceptacją, aby poprawić jakość.
Kryteria akceptacji:

- Edycja inline z walidacją długości w czasie rzeczywistym.
- Zapis edycji nie wymaga przeładowania listy.
- Edytowany kandydat można następnie Accept lub Reject.

US-009 Odrzucenie kandydata
Opis: Jako użytkownik chcę odrzucić kandydata, który jest nietrafny, aby nie trafił do bazy.
Kryteria akceptacji:

- Kliknięcie Reject ukrywa kandydata z widoku lub oznacza jako odrzucony.
- Odrzucenie można cofnąć do czasu zbiorczego zapisu.

US-010 Zapis zbiorczy zaakceptowanych
Opis: Jako użytkownik chcę zapisać wszystkie zaakceptowane karty naraz, aby oszczędzić czas.
Kryteria akceptacji:

- Przycisk Zapisz X kart jest aktywny, gdy X > 0.
- Po sukcesie wyświetla się liczba zapisanych kart, a kandydaci znikają.
- Zapis automatycznie przypisuje fiszki do harmonogramu powtórek.

US-011 Ostrzeżenie o niezapisanych zmianach
Opis: Jako użytkownik chcę otrzymać ostrzeżenie przy opuszczaniu strony recenzji, jeśli mam niezapisane zmiany.
Kryteria akceptacji:

- Próba nawigacji bez zapisu wyświetla modal z wyborem: Zapisz teraz, Odrzuć zmiany, Anuluj.

US-012 Ręczne tworzenie fiszki
Opis: Jako użytkownik chcę ręcznie dodać fiszkę, gdy AI nie jest potrzebna.
Kryteria akceptacji:

- Formularz front/back z walidacją długości.
- Po zapisie fiszka trafia do harmonogramu powtórek.

US-013 Lista fiszek i wyszukiwanie
Opis: Jako użytkownik chcę przeglądać i wyszukiwać zapisane fiszki, aby szybko je znaleźć.
Kryteria akceptacji:

- Widok listy z polem wyszukiwania pełnotekstowego.
- Sortowanie po dacie utworzenia i ostatniej edycji.
- Kliknięcie pozycji otwiera edycję.

US-014 Edycja zapisanej fiszki
Opis: Jako użytkownik chcę edytować istniejącą fiszkę, aby poprawić treść.
Kryteria akceptacji:

- Edycja walidowana; zapis aktualizuje datę modyfikacji.
- Zmiany odzwierciedlane są w kolejnych powtórkach bez resetu historii algorytmu.

US-015 Usuwanie fiszki
Opis: Jako użytkownik chcę usunąć niepotrzebną fiszkę.
Kryteria akceptacji:

- Akcja wymaga potwierdzenia.
- Usunięta fiszka znika z listy i z harmonogramu powtórek.

US-016 Sesja nauki: pobranie dzisiejszych kart
Opis: Jako użytkownik chcę rozpocząć naukę kart zaplanowanych na dziś.
Kryteria akceptacji:

- Ekran Nauki pokazuje kolejno karty z harmonogramu.
- Dla każdej karty można odsłonić tył.

US-017 Sesja nauki: odpowiedź i zapis wyniku
Opis: Jako użytkownik chcę ocenić swoją odpowiedź zgodnie z wymaganiami schedulera (np. skala trafności), aby zaktualizować harmonogram.
Kryteria akceptacji:

- Po ocenie karta jest przekazywana do schedulera, a termin następnej powtórki jest aktualizowany.
- Po ukończeniu sesji pokazane jest podsumowanie.

US-018 Podsumowanie aktywności
Opis: Jako użytkownik chcę zobaczyć ile kart wygenerowałem, zaakceptowałem, zapisałem oraz ile przerobiłem dziś.
Kryteria akceptacji:

- Widok pokazuje metryki dnia i wybranych zakresów.
- Dane odświeżają się po działaniach użytkownika.

US-019 Usuwanie konta i danych
Opis: Jako użytkownik chcę trwale usunąć konto wraz z danymi, aby skorzystać z prawa do bycia zapomnianym.
Kryteria akceptacji:

- Proces wymaga potwierdzenia i ponownego podania hasła.
- Po zakończeniu konto i wszystkie dane są usunięte, sesja wylogowana.

US-020 Błąd generacji i ponów próbę
Opis: Jako użytkownik chcę móc ponowić generację po błędzie lub timeoutcie.
Kryteria akceptacji:

- Widoczny komunikat błędu z przyciskiem Spróbuj ponownie.
- Ponowienie nie duplikuje wcześniej zaakceptowanych kandydatów.

US-021 Ograniczenia wejścia
Opis: Jako użytkownik chcę jasne informacje, gdy mój tekst jest zbyt krótki lub za długi.
Kryteria akceptacji:

- Komunikat z informacją o wymaganym zakresie i liczniku znaków.
- Przycisk Generuj jest nieaktywny do spełnienia warunków.

US-022 Dostępność i nawigacja klawiaturą
Opis: Jako użytkownik chcę obsłużyć proces recenzji i nauki klawiaturą.
Kryteria akceptacji:

- Skróty do Accept/Edit/Reject i przejścia między kartami.
- Elementy posiadają focus state i etykiety ARIA.

US-023 Ochrona sesji i bezpieczeństwo dostępu
Opis: Jako użytkownik chcę, aby moja sesja była bezpieczna i wygasała po okresie bezczynności.
Kryteria akceptacji:

- Wygasanie sesji po skonfigurowanym czasie bezczynności.
- Po wygaśnięciu wymagane jest ponowne logowanie.
- Ochrona przed CSRF/XSS potwierdzona testami.

US-024 Wykrywanie konfliktów edycji
Opis: Jako użytkownik chcę uniknąć utraty zmian podczas edycji tej samej fiszki w wielu kartach przeglądarki.
Kryteria akceptacji:

- System ostrzega o konflikcie i proponuje nadpisanie lub odświeżenie.
- Zmiany są scalane lub jedna z wersji jest wyraźnie wybrana.

US-025 Informacja o kosztach i limitach systemu
Opis: Jako administrator produktu chcę mieć alerty kosztowe i podstawowe dashboardy zużycia LLM.
Kryteria akceptacji:

- Ustawione progi alertów.
- Rejestrowane metryki: długość wejścia, czas generacji, koszt szacowany.

US-026 Lokalizacja UI i skalowanie językowe
Opis: Jako użytkownik chcę spójny polski interfejs, a zespół produktowy chce łatwo dodać nowe języki w przyszłości.
Kryteria akceptacji:

- Wszystkie teksty w UI pochodzą z plików i18n.
- Dodanie kolejnego języka nie wymaga zmian w logice.

US-027 Zgodność z RODO
Opis: Jako użytkownik w UE chcę mieć pewność, że mogę pobrać politykę prywatności i wiem, jak usunąć dane.
Kryteria akceptacji:

- Widoczny link do polityki i opisu procesu usuwania danych.
- Mechanizm usuwania danych działa zgodnie z US-020.

US-028 Logowanie zdarzeń bez treści wrażliwych
Opis: Jako zespół chcemy audytować operacje bez przechowywania pełnych treści fiszek w logach.
Kryteria akceptacji:

- Logi zawierają identyfikatory i metadane, nie zawierają tekstów fiszek.
- Logi są dostępne do diagnozy błędów.

US-029 Responsywność
Opis: Jako użytkownik chcę korzystać z aplikacji na urządzeniach mobilnych przez przeglądarkę.
Kryteria akceptacji:

- Widoki generacji, recenzji i nauki są czytelne na szerokościach 360 px i większych.
- Brak poziomych scrolli w typowych przepływach.

US-030 Rate limiting i ochrona przed nadużyciami
Opis: Jako zespół chcemy chronić endpointy generacji i auth przed nadużyciami.
Kryteria akceptacji:

- Limity zapytań per IP/użytkownik z czytelnymi komunikatami w razie przekroczenia.
- Próby brute force logowania są wykrywane i blokowane.

US-031 Podgląd wyników przed zapisem
Opis: Jako użytkownik chcę zobaczyć podsumowanie liczby zaakceptowanych, edytowanych i odrzuconych przed zapisem.
Kryteria akceptacji:

- Modal podsumowania z liczbami i opcją powrotu do recenzji.
- Po potwierdzeniu następuje zapis i komunikat sukcesu.

US-032 Import pojedynczego tekstu z pola URL (opcjonalne)
Opis: Jako użytkownik chcę wkleić URL do publicznego artykułu i pobrać czysty tekst do generacji.
Kryteria akceptacji:

- Jeśli funkcja jest dostępna, system pobiera i czyści tekst, liczy znaki, stosuje te same limity.
- W razie błędu wyświetla komunikat i umożliwia wklejenie ręczne.
  Uwaga: jeśli implementacja URL nie wejdzie do MVP, historia pozostaje odroczona.

US-033 Eksport własnych danych (odroczone)
Opis: Jako użytkownik chcę pobrać moje fiszki jako CSV.
Kryteria akceptacji:

- Eksportuje wybrane pola front/back oraz metadane minimalne.
- Plik generowany asynchronicznie lub natychmiastowo dla małych zbiorów.
  Uwaga: poza MVP, dodane dla pełni ścieżek przyszłych.

## 6. Metryki sukcesu

KPI główne

- AI-acceptance rate: odsetek kandydatów wygenerowanych przez AI, które użytkownik zaakceptował i zapisał. Cel: co najmniej 75%.
- AI-usage rate: odsetek nowo utworzonych fiszek powstałych z AI w stosunku do wszystkich nowych fiszek. Cel: co najmniej 75%.

Lista kontrolna PRD

- Każda historia ma testowalne kryteria akceptacji.
- Kryteria są jasne i konkretne, obejmują scenariusze podstawowe, alternatywne i skrajne.
- Zestaw historyjek pokrywa pełną funkcjonalność MVP: generacja, recenzja, CRUD, nauka, auth, RODO, błędy i bezpieczeństwo.
- Wymagania dotyczące uwierzytelniania i autoryzacji są ujęte w US-001–US-004 oraz US-024 i US-031.
