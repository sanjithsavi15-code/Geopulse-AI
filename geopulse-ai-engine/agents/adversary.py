import os

from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate


def run_adversary(proposed_route, anomaly_desc):
    """Dynamically critiques ANY proposed route based on the disaster."""

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return {
            "agent": "Adversarial",
            "action": "CRITIQUE",
            "message": (
                "Warning: proposed bypass may overload secondary corridors "
                f"along {', '.join(proposed_route)}."
            ),
        }

    llm = ChatGroq(
        api_key=api_key,
        model="llama-3.1-8b-instant",
        temperature=0.2
    )

    # Convert the Python list of nodes into a readable string
    route_str = ", ".join(proposed_route)

    # Notice how we now pass {anomaly_desc} and {route_str} dynamically
    prompt = PromptTemplate.from_template(
        """You are an adversarial AI logistics risk assessor.
        CRITICAL EVENT: {anomaly_desc}
        The standard routing algorithm has proposed this bypass: {route_str}.

        Critique this proposed route in exactly one short, dramatic sentence.
        Focus on why taking this specific route will cause secondary
        infrastructure failure or massive gridlock.
        CRITICAL INSTRUCTION: You MUST explicitly include the exact node names
        ({route_str}) in your sentence so the orchestrator can identify."""
    )

    chain = prompt | llm
    response = chain.invoke(
        {"route_str": route_str, "anomaly_desc": anomaly_desc})

    return {
        "agent": "Adversarial",
        "action": "CRITIQUE",
        "message": response.content
    }
