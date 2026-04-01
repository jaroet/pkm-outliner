import json
import uuid
import random
from datetime import datetime, timedelta

def generate_bulletproof_vault():
    nodes = []
    total_knowledge_notes = 1500
    
    # --- STAP 1: DEFINIEER DE VASTE ENTITEITEN ---
    people = ["Alice Chen", "Bob Richards", "Director Sarah", "Tech Lead James", "Elena Rossi"]
    meetings = ["Daily Standup", "Quarterly Review", "Brainstorming Session", "Steering Committee"]
    themes = {
        "History of Tech": ["Analytical Engine", "Transistor", "Mainframe", "Silicon Valley", "GUI"],
        "Sci-Fi Universe": ["Delta Sector", "Titan Refinery", "Europa Ocean", "Mars Project"],
        "Business Operations": ["Strategic Planning", "Financial Audit", "Client Acquisition", "Project Icarus"]
    }

    # --- STAP 2: PRE-GENEREER ALLE REGISTRY ENTRIES ---
    registry = []
    
    # Root & Directories
    root_id = str(uuid.uuid4())
    registry.append({"id": root_id, "title": "Central Command - Home", "type": "Root"})
    
    theme_ids = {}
    for t_name in themes.keys():
        t_id = str(uuid.uuid4())
        theme_ids[t_name] = t_id
        registry.append({"id": t_id, "title": f"Directory: {t_name}", "type": "Directory"})

    # Mensen en Meetings als echte notities (zodat de links werken)
    for p in people:
        registry.append({"id": str(uuid.uuid4()), "title": p, "type": "Person"})
    for m in meetings:
        registry.append({"id": str(uuid.uuid4()), "title": m, "type": "Meeting"})

    # Kennisnotities
    for i in range(total_knowledge_notes):
        t_name = random.choice(list(themes.keys()))
        base = random.choice(themes[t_name])
        title = f"{base} - {random.choice(['Archive', 'Log', 'Manual'])} {uuid.uuid4().hex[:4]}"
        registry.append({"id": str(uuid.uuid4()), "title": title, "type": "Knowledge"})

    # Journals (Jan-Maart 2026)
    start_date = datetime(2026, 1, 1)
    journal_entries = []
    for d in range(90):
        dt = start_date + timedelta(days=d)
        j_id = str(uuid.uuid4())
        j_title = dt.strftime("%Y-%m-%d")
        journal_entries.append({"id": j_id, "title": j_title, "type": "Journal"})
    registry.extend(journal_entries)

    # --- STAP 3: BOUW DE OBJECTEN ---
    # Maak een map voor snelle lookups van titels voor de content
    id_to_title = {r["id"]: r["title"] for r in registry}
    people_titles = [r["title"] for r in registry if r["type"] == "Person"]
    meeting_titles = [r["title"] for r in registry if r["type"] == "Meeting"]
    knowledge_titles = [r["title"] for r in registry if r["type"] == "Knowledge"]

    for r in registry:
        ts = int(datetime(2026, 1, 1).timestamp() * 1000) + random.randint(0, 5000000)
        content = f"# {r['title']}\n\n"
        
        if r["type"] == "Journal":
            content += f"## Activities\n"
            content += f"* Meeting with [[{random.choice(people_titles)}]] regarding project status.\n"
            content += f"* Participated in [[{random.choice(meeting_titles)}]] this morning.\n"
            content += f"* Studied the latest updates on [[{random.choice(knowledge_titles)}]].\n"
        elif r["type"] == "Knowledge":
            content += f"Technical documentation for {r['title']}.\n\nRelated concepts:\n"
            content += f"* [[{random.choice(knowledge_titles)}]]\n* [[{random.choice(knowledge_titles)}]]"
        else:
            content += f"Standard entry for {r['type']} category."

        node = {
            "id": r["id"],
            "title": r["title"],
            "content": content,
            "linksTo": [],
            "outgoingLinks": [],
            "isFavorite": (r["type"] == "Root"),
            "createdAt": ts,
            "modifiedAt": ts + 5000
        }
        nodes.append(node)

    # --- STAP 4: VERIFIEER DE OUTGOING LINKS ---
    # We scannen de content op [[...]] en vullen outgoingLinks met de juiste IDs
    title_to_id = {r["title"]: r["id"] for r in registry}
    
    for node in nodes:
        # Vul outgoingLinks op basis van tekst
        for title, node_id in title_to_id.items():
            if f"[[{title}]]" in node["content"]:
                if node_id not in node["outgoingLinks"]:
                    node["outgoingLinks"].append(node_id)
        
        # Vul linksTo (Tree) - geef elke notitie 2-3 willekeurige parents
        if node["id"] != root_id:
            num_parents = random.randint(2, 3)
            parents = random.sample(nodes, k=num_parents)
            for p in parents:
                if p["id"] != node["id"] and node["id"] not in p["linksTo"]:
                    p["linksTo"].append(node["id"])

    # --- STAP 5: EXPORT ---
    with open('Verified_PKM_Vault_2026.json', 'w', encoding='utf-8') as f:
        json.dump(nodes, f, indent=2, ensure_ascii=False)

    print(f"Klaar! {len(nodes)} notities gegenereerd met 100% geverifieerde links.")

if __name__ == "__main__":
    generate_bulletproof_vault()