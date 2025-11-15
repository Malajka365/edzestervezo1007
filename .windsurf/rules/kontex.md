---
trigger: manual
---

# LLM Kontextus- és Memóriakezelési Szabályzat
# Formátum: WindsorDF / általános ruleset YAML
# Cél: utasítás-jellegű, az LLM viselkedését közvetlenül irányító szabályzat
# Megjegyzés: ha a WindsorDF más kulcsneveket vár, átnevezhetőek a mezők (pl. system_prompt, hooks, guards).

name: LLM_Context_Memory_Szabalyzat
version: 1.0.0
language: hu-HU
description: >-
  Utasítás-jellegű szabályzat az LLM számára a kontextus- és memóriakezeléshez
  (Anthropic Context Management elvei alapján). A cél a relevancia, a folytonosság
  és a token-hatékonyság fenntartása hosszú futású feladatokban és ügynökalapú
  munkafolyamatokban.

priority: high  # biztosítsd, hogy a core irányelvek előtt fusson

# --- GLOBÁLIS META-UTASÍTÁSOK -------------------------------------------------
meta_instructions:
  - "Mindig őrizd meg a beszélgetés és a feladat végrehajtásának folytonosságát."
  - "A relevancia és a felhasználói cél elsődleges; minden egyéb információ csak addig tartható meg, amíg ezt támogatja."
  - "Proaktívan kezeld a kontextus-limit közeli állapotokat: törölj irreleváns tartalmakat, szükség esetén tömöríts."
  - "A hosszú távon értékes információkat külső memóriába mentsd és onnan hívd vissza."

# --- KONTEXTUS-SZERKESZTÉSI SZABÁLYOK ----------------------------------------
context_editing:
  threshold:
    percent_warning: 0.80   # 80% felett indíts előkészítést
    percent_hard: 0.95      # 95% felett azonnali tisztítás
  deletion_policy:
    - when: "tool_call || tool_result régi vagy irreleváns az aktuális célhoz"
      action: "remove_from_context"
    - when: "ismétlődő információ (>=3x)"
      action: "summarize_then_prune"
    - when: "téma- vagy célváltás felismerve"
      action: ["create_new_focus", "archive_previous_focus"]
  retention_policy:
    keep:
      - "felhasználói cél/brief, legutóbbi döntések, állapotváltozók"
      - "biztonsági korlátok / rendszerutasítások"
      - "kritikus hivatkozások (azonosítók, konfigurációs kulcsok, forrásjegyzetek)"
    compress:
      - "hosszú listák, naplók, részletes tool-trace → rövid összegzés"
    drop:
      - "lejárt, téves vagy a jelen célhoz nem kapcsolódó részletek"

# --- MEMÓRIA-HASZNÁLAT --------------------------------------------------------
memory:
  backend: client_side_filesystem  # WindsorDF-ben vagy más IDE-ben implementált
  structure:
    root: memory/
    files:
      - decisions.md
      - user_prefs.yaml
      - project_state.json
      - knowledge_notes.md
  write_rules:
    - when: "új, hosszú távon értékes tudáselem vagy döntés születik"
      action: "append_or_update"
    - when: "állapot/friss paraméterek, amelyek több menetben kellenek"
      action: "persist_state"
  read_rules:
    - when: "feladat ismétlődik / folytatás történik / releváns precedens gyanítható"
      action: "retrieve_relevant"
  hygiene:
    - "időszakos konszolidáció: duplikátumok összevonása"
    - "elavult bejegyzések archiválása vagy törlése"

# --- DÖNTÉSHOZATALI HIERARCHIA ------------------------------------------------
priority_order:
  - user_goal           # elsődleges: aktuális cél
  - context_freshness   # másodlagos: ne használj elavult adatot
  - memory_consistency  # harmadlagos: hosszú távú koherencia
  - efficiency          # negyedik: token- és időhatékonyság

# --- AUTOMATIKUS MŰKÖDÉSI MINTÁK ----------------------------------------------
automations:
  on_context_usage:
    - if: "usage >= 0.80 && usage < 0.95"
      do:
        - "rank_context_by_relevance()"
        - "summarize_repetitions()"
        - "prune_irrelevant_tool_traces()"
    - if: "usage >= 0.95"
      do:
        - "force_prune_noncritical()"
        - "ensure_focus_coherence()"
  on_new_key_info:
    - do:
        - "write_to_memory(compact_summary)"
        - "tag_memory(['topic','project','date'])"
  on_goal_change:
    - do:
        - "start_new_focus()"
        - "archive_previous_focus()"
        - "reseed_context_from_memory(relevant=true)"
  on_repeated_data:
    - if: "repeat_count >= 3"
      do:
        - "summarize_block()"
        - "replace_with_summary()"

# --- ÖNELLENŐRZÉS / GUARDS ----------------------------------------------------
guards:
  self_checks:
    - "A kontextus tartalma releváns és tömör?"
    - "A memória naprakész és visszakereshető?"
    - "Nincsenek elavult/ismétlődő tool-hívások a kontextusban?"
    - "A token-használat biztonságos tartományban van?"
    - "Az aktuális felhasználói célt pontosan szolgálja a válasz?"
  fail_safes:
    - when: "kontextus koherencia sérülne a törléstől"
      action: "rollback_last_prune() && compress_instead()"
    - when: "memória olvasás sikertelen"
      action: "fallback_to_user_clarification(minimal)"

# --- VÁLASZGENERÁLÁSI IRÁNYELVEK ---------------------------------------------
response_style:
  - "Kerüld a redundanciát; hivatkozz tömör összegzésekre."
  - "Jelöld, ha visszahívtál memóriát (pl. 'Korábbi jegyzet alapján…')."
  - "Friss cél esetén röviden erősítsd meg az új fókuszt."
  - "Ne ígérj jövőbeli háttérmunkát; a kérést a jelen válaszban kezeld."

# --- NAPLÓZÁS (opcionális) ----------------------------------------------------
logging:
  level: info
  emit:
    - "context_rank_changes"
    - "pruned_items_count"
    - "memory_writes"
    - "memory_reads"

# --- INTEGRÁCIÓS HOOKOK (pszeudó) --------------------------------------------
hooks:
  rank_context_by_relevance: |
    # Rangsorold a kontextus elemeit a felhasználói cél szerint (top-k válogatás)
    # return: ordered_items
  summarize_repetitions: |
    # Ismétlődő blokkokat egyesíts rövid, informatív összefoglalóvá
  prune_irrelevant_tool_traces: |
    # Régi tool-hívások és trace-ek eltávolítása, ha nincs aktuális hasznuk
  force_prune_noncritical: |
    # Kritikus elemek védelme mellett erélyes tisztítás
  ensure_focus_coherence: |
    # Ellenőrizd, hogy a megmaradó kontextus koherens és folytatható
  write_to_memory: |
    # Kompakt összefoglaló tárolása a memory/ alá
  tag_memory: |
    # Kereshetőséget javító címkék felvétele
  start_new_focus: |
    # Új fókuszblokk nyitása (téma- vagy célváltáskor)
  archive_previous_focus: |
    # Előző fókusz tömörítése és archiválása
  reseed_context_from_memory: |
    # Releváns memória-elemek visszatöltése új fókuszhoz
  summarize_block: |
    # Hosszú, ismétlődő rész helyettesítése összegzéssel
  replace_with_summary: |
    # A kiválasztott blokkot cseréld a létrehozott összegzésre
  rollback_last_prune: |
    # Vészhelyzeti visszagörgetés, ha koherencia sérülne
  compress_instead: |
    # Teljes törlés helyett veszteségmentes tömörítés
  fallback_to_user_clarification: |
    # Minimalista visszakérdezés csak hiba esetén

# --- VÉGRENDELTETÉS -----------------------------------------------------------
assertions:
  - "A modell nem lépi túl a kontextus-keretet a fenti lépések pontos végrehajtása mellett."
  - "A válaszok a felhasználói célt elsődlegesen szolgálják, rövid, pontos és releváns módon."
