"""
Seed sample data for new users on registration.
Creates sample clauses, templates, and contracts.
"""
from datetime import date, timedelta
from app.models.clause import Clause
from app.models.template import Template
from app.models.contract import Contract
from app.models.contract_version import ContractVersion


# ─────────────────────────────────────────────
# Sample Clauses
# ─────────────────────────────────────────────

SAMPLE_CLAUSES = [
    {
        "title": "Sample Confidentiality Clause",
        "category": "Confidentiality",
        "content": (
            "Confidentiality. Each party agrees to keep confidential all non-public information "
            "disclosed by the other party in connection with this Agreement ('Confidential Information'). "
            "Neither party shall disclose Confidential Information to any third party without prior written "
            "consent, and shall use Confidential Information solely for the purposes of this Agreement. "
            "This obligation survives termination of the Agreement for a period of three (3) years."
        ),
    },
    {
        "title": "Sample Limitation of Liability Clause",
        "category": "Liability",
        "content": (
            "Limitation of Liability. In no event shall either party be liable to the other for any "
            "indirect, incidental, special, consequential, or punitive damages, including but not limited "
            "to loss of profits, loss of data, or business interruption, even if advised of the possibility "
            "of such damages. Each party's total aggregate liability under this Agreement shall not exceed "
            "the fees paid or payable by the Client in the twelve (12) months preceding the claim."
        ),
    },
    {
        "title": "Sample Indemnification Clause",
        "category": "Indemnity",
        "content": (
            "Indemnification. Each party ('Indemnifying Party') shall defend, indemnify, and hold harmless "
            "the other party and its officers, directors, employees, and agents from and against any claims, "
            "damages, losses, and expenses (including reasonable legal fees) arising out of or relating to "
            "the Indemnifying Party's breach of this Agreement, negligence, or wilful misconduct."
        ),
    },
    {
        "title": "Sample Governing Law Clause",
        "category": "Governing Law",
        "content": (
            "Governing Law and Jurisdiction. This Agreement shall be governed by and construed in accordance "
            "with the laws of England and Wales, without regard to its conflict of law provisions. Any dispute "
            "arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction "
            "of the courts of England and Wales."
        ),
    },
    {
        "title": "Sample Termination for Convenience Clause",
        "category": "Termination",
        "content": (
            "Termination for Convenience. Either party may terminate this Agreement at any time without cause "
            "by providing thirty (30) days' written notice to the other party. Upon termination, the Client "
            "shall pay all fees for services rendered up to the effective date of termination, and the Service "
            "Provider shall deliver all work product completed as of that date."
        ),
    },
    {
        "title": "Sample Force Majeure Clause",
        "category": "Force Majeure",
        "content": (
            "Force Majeure. Neither party shall be liable for any failure or delay in performance under this "
            "Agreement to the extent such failure or delay is caused by circumstances beyond that party's "
            "reasonable control, including but not limited to acts of God, natural disasters, pandemic, war, "
            "terrorism, government actions, or widespread internet outages. The affected party shall promptly "
            "notify the other party and use reasonable efforts to resume performance."
        ),
    },
    {
        "title": "Sample Intellectual Property Ownership Clause",
        "category": "Intellectual Property",
        "content": (
            "Intellectual Property. All intellectual property, including but not limited to inventions, "
            "software, designs, and works of authorship, created by the Service Provider specifically for "
            "the Client under this Agreement ('Work Product') shall, upon full payment, be assigned to and "
            "owned by the Client. The Service Provider retains ownership of all pre-existing tools, "
            "methodologies, and general knowledge used in delivering the services."
        ),
    },
    {
        "title": "Sample Payment Terms Clause",
        "category": "Payment",
        "content": (
            "Payment Terms. The Client shall pay all invoices issued by the Service Provider within thirty "
            "(30) days of the invoice date. Late payments shall accrue interest at the rate of 1.5% per month "
            "(or the maximum rate permitted by applicable law, whichever is lower) from the due date until "
            "the date of actual payment. The Service Provider reserves the right to suspend services for "
            "overdue accounts after ten (10) days' written notice."
        ),
    },
]


# ─────────────────────────────────────────────
# Sample Templates
# ─────────────────────────────────────────────

SAMPLE_TEMPLATES = [
    {
        "name": "Sample NDA Template",
        "description": "Standard mutual non-disclosure agreement between two parties.",
        "content": """MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of {{effective_date}} between:

{{party_a_name}}, a company incorporated in {{party_a_jurisdiction}} ("Party A"), and
{{party_b_name}}, a company incorporated in {{party_b_jurisdiction}} ("Party B").

1. PURPOSE
The parties wish to explore a potential business relationship (the "Purpose") and, in connection therewith, may disclose confidential information to each other.

2. CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public information disclosed by either party, whether orally, in writing, or by any other means, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information.

3. OBLIGATIONS
Each party agrees to:
(a) keep all Confidential Information strictly confidential;
(b) not disclose Confidential Information to any third party without prior written consent;
(c) use Confidential Information solely for the Purpose;
(d) protect Confidential Information with at least the same degree of care it uses to protect its own confidential information, but no less than reasonable care.

4. TERM
This Agreement shall remain in effect for a period of two (2) years from the effective date.

5. GOVERNING LAW
This Agreement shall be governed by the laws of {{governing_law}}.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

{{party_a_name}}                    {{party_b_name}}
Signature: ___________________      Signature: ___________________
Name:      ___________________      Name:      ___________________
Title:     ___________________      Title:     ___________________
Date:      ___________________      Date:      ___________________
""",
    },
    {
        "name": "Sample Service Agreement Template",
        "description": "General services agreement between a service provider and client.",
        "content": """SERVICE AGREEMENT

This Service Agreement ("Agreement") is made as of {{effective_date}} between:

{{service_provider_name}} ("Service Provider"), and
{{client_name}} ("Client").

1. SERVICES
The Service Provider agrees to provide the following services: {{services_description}}.

2. TERM
This Agreement commences on {{start_date}} and continues until {{end_date}}, unless earlier terminated.

3. FEES AND PAYMENT
The Client shall pay the Service Provider {{fee_amount}} per {{fee_period}}. Invoices are due within 30 days of receipt.

4. INTELLECTUAL PROPERTY
All work product created specifically for the Client under this Agreement shall be owned by the Client upon full payment.

5. CONFIDENTIALITY
Each party agrees to keep the other party's confidential information strictly confidential and not to disclose it to any third party.

6. LIMITATION OF LIABILITY
In no event shall either party be liable for indirect, incidental, or consequential damages. Total liability shall not exceed fees paid in the preceding 12 months.

7. TERMINATION
Either party may terminate this Agreement with 30 days' written notice. The Client shall pay for all services rendered up to the termination date.

8. GOVERNING LAW
This Agreement is governed by the laws of {{governing_law}}.

SERVICE PROVIDER                    CLIENT
Signature: ___________________      Signature: ___________________
Name:      ___________________      Name:      ___________________
Date:      ___________________      Date:      ___________________
""",
    },
    {
        "name": "Sample Employment Offer Letter Template",
        "description": "Offer letter template for new employee onboarding.",
        "content": """EMPLOYMENT OFFER LETTER

{{offer_date}}

{{candidate_name}}
{{candidate_address}}

Dear {{candidate_name}},

We are pleased to offer you the position of {{job_title}} at {{company_name}}, commencing on {{start_date}}.

POSITION AND DUTIES
You will report to {{reporting_manager}} and your primary responsibilities will include {{job_duties}}.

COMPENSATION
Your base salary will be {{salary_amount}} per annum, payable monthly. You will also be eligible for a discretionary performance bonus of up to {{bonus_percentage}}% of your annual salary.

BENEFITS
You will be entitled to:
- {{annual_leave}} days of paid annual leave per year
- Private health insurance
- Pension contributions of {{pension_percentage}}%

PROBATION PERIOD
Your employment is subject to a probation period of {{probation_period}} months, during which either party may terminate the employment with one week's notice.

CONFIDENTIALITY
You agree to keep all company information confidential during and after your employment.

ACCEPTANCE
Please sign and return this letter by {{acceptance_deadline}} to confirm your acceptance of this offer.

We look forward to welcoming you to the team.

Yours sincerely,

{{hr_signatory_name}}
{{hr_signatory_title}}
{{company_name}}

ACCEPTED BY:
Signature: ___________________
Name:      {{candidate_name}}
Date:      ___________________
""",
    },
]


# ─────────────────────────────────────────────
# Sample Contracts
# ─────────────────────────────────────────────

def _sample_contracts(owner_id):
    today = date.today()
    return [
        {
            "title": "Sample NDA — Acme Corp",
            "content": """MUTUAL NON-DISCLOSURE AGREEMENT

This Agreement is entered into as of 1 June 2026 between ContractPilot Ltd ("Party A") and Acme Corp ("Party B").

1. PURPOSE
The parties wish to explore a potential technology partnership and may share confidential information in connection therewith.

2. CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public information disclosed by either party that is designated as confidential or that reasonably should be understood to be confidential.

3. OBLIGATIONS
Each party agrees to keep all Confidential Information strictly confidential, not to disclose it to third parties without consent, and to use it solely for evaluating the potential partnership.

4. TERM
This Agreement shall remain in effect for two (2) years from the effective date.

5. GOVERNING LAW
This Agreement is governed by the laws of England and Wales.

[SAMPLE DOCUMENT — FOR DEMONSTRATION PURPOSES]
""",
            "start_date": today,
            "end_date": today + timedelta(days=365),
            "reminder_date": today + timedelta(days=335),
        },
        {
            "title": "Sample Service Agreement — TechCo Ltd",
            "content": """SERVICE AGREEMENT

This Agreement is made as of 1 June 2026 between ContractPilot Ltd ("Service Provider") and TechCo Ltd ("Client").

1. SERVICES
The Service Provider agrees to provide software development and consulting services as reasonably requested by the Client.

2. TERM
This Agreement commences on 1 June 2026 and continues for twelve (12) months.

3. FEES
The Client shall pay £5,000 per month for the services described above. Invoices are due within 30 days of receipt.

4. INTELLECTUAL PROPERTY
All work product created for the Client shall be owned by the Client upon full payment of all fees.

5. CONFIDENTIALITY
Both parties agree to maintain the confidentiality of the other party's proprietary information.

6. TERMINATION
Either party may terminate this Agreement with 30 days' written notice.

7. GOVERNING LAW
This Agreement is governed by the laws of England and Wales.

[SAMPLE DOCUMENT — FOR DEMONSTRATION PURPOSES]
""",
            "start_date": today,
            "end_date": today + timedelta(days=365),
            "reminder_date": today + timedelta(days=335),
        },
        {
            "title": "Sample Employment Offer — Jane Smith",
            "content": """EMPLOYMENT OFFER LETTER

1 June 2026

Jane Smith

Dear Jane,

We are pleased to offer you the position of Senior Software Engineer at ContractPilot Ltd, commencing on 15 June 2026.

COMPENSATION
Your base salary will be £75,000 per annum, payable monthly. You will be eligible for a discretionary performance bonus of up to 15% of your annual salary.

BENEFITS
- 25 days of paid annual leave per year
- Private health insurance
- Pension contributions of 5%

PROBATION PERIOD
Your employment is subject to a probation period of 3 months.

We look forward to welcoming you to the team.

Yours sincerely,
HR Department
ContractPilot Ltd

[SAMPLE DOCUMENT — FOR DEMONSTRATION PURPOSES]
""",
            "start_date": today,
            "end_date": today + timedelta(days=365),
            "reminder_date": None,
        },
    ]


# ─────────────────────────────────────────────
# Main seed function
# ─────────────────────────────────────────────

def seed_sample_data(db, owner_id):
    """Called after new user registration. Creates sample clauses, templates, and contracts."""

    # Clauses
    for c in SAMPLE_CLAUSES:
        db.add(Clause(owner_id=owner_id, **c))

    # Templates
    for t in SAMPLE_TEMPLATES:
        db.add(Template(owner_id=owner_id, **t))

    # Contracts + first version
    for c_data in _sample_contracts(owner_id):
        contract = Contract(owner_id=owner_id, **c_data)
        db.add(contract)
        db.flush()
        db.add(ContractVersion(
            contract_id=contract.id,
            content=contract.content,
            version_number=1,
        ))

    db.commit()
