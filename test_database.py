import os
import uuid
import database
from database import init_db, get_db, AnalysisSession, ChatMessage


def run_verification():
    print("[Test]Initializing database...")
    init_db()

    test_session_id = f"test_session_{uuid.uuid4().hex[:8]}"

    db = next(get_db())
    try:
        session = db.query(AnalysisSession).filter(AnalysisSession.id == test_session_id).first()
        if not session:
            session = AnalysisSession(
                id=test_session_id,
                title="Database verification session",
            )
            db.add(session)
            db.commit()

        msg_id = f"test_msg_{uuid.uuid4().hex[:8]}"
        msg = ChatMessage(
            id=msg_id,
            session_id=test_session_id,
            role="user",
            content="Verification prompt: confirm chat persistence works.",
        )
        db.add(msg)
        db.commit()

        stored = db.query(ChatMessage).filter(ChatMessage.id == msg_id).first()
        if stored is None:
            raise RuntimeError("ChatMessage was not persisted.")

        print(f"[Test]Database active dialect: {database.ACTIVE_DIALECT}")
        print(f"[Test]Session created: {session.id}")
        print(f"[Test]Chat message persisted: {stored.id} -> {stored.content}")
        print("[Test]Verification successful.")
    finally:
        db.close()


if __name__ == "__main__":
    run_verification()
