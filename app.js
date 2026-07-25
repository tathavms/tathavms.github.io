/* Tathagata Banerjee — portfolio. Vanilla JS, no build step. */

const PROJECTS = [
      {
        id: 'qagent',
        name: 'QNLP Research Agent',
        tag: 'RAG · LangGraph',
        status: 'In progress',
        blurb: 'A RAG agent that answers questions about quantum-NLP papers with citations, and turns plain English sentences into lambeq string diagrams and IQP quantum circuits.',
        peek: ['LangGraph', 'Qdrant', 'bge-m3', 'lambeq'],
        linkNote: 'In progress · not deployed yet',
        metrics: [
          { v: '26', l: 'question eval set' },
          { v: '3', l: 'papers indexed' },
          { v: '+11 pts', l: 'recall recovered' },
          { v: '4', l: 'agent tools' }
        ],
        summary: [
          'A question-answering agent that reads quantum-NLP research papers and answers questions about them. Every answer carries a citation back to the paper and section it came from, so a claim can always be checked against the source.',
          'It also does something a general chat model cannot do. Give it any English sentence and it builds the lambeq string diagram and the IQP quantum circuit for that sentence. Both sides sit behind one agent that decides which one to use.'
        ],
        hasFlow: true,
        flowLabel: 'Request path',
        flow: [
          { n: '01', step: 'PDF ingestion', note: 'LaTeX blocks and tables are held together as single units before splitting.' },
          { n: '02', step: 'Embed → Qdrant', note: 'BAAI/bge-m3 vectors, stored with section metadata for citation.' },
          { n: '03', step: 'LangGraph agent decides', note: 'Retrieval tool, or one of three lambeq tools. The agent picks per question, it is not a fixed chain.' },
          { n: '04', step: 'Multi-query + MMR retrieve', note: 'Several rewrites of the question, diversified results.' },
          { n: '05', step: 'Cross-encoder rerank', note: 'Reorders candidates before they reach the model.' },
          { n: '06', step: 'Answer with citations', note: 'Grounded answer plus the paper and section it came from.' }
        ],
        stack: [
          { label: 'Retrieval', items: ['BAAI/bge-m3', 'Qdrant', 'MMR search', 'multi-query retrieval', 'cross-encoder reranker'] },
          { label: 'Agent orchestration', items: ['LangGraph', 'StateGraph', 'ToolNode', 'LangChain (LCEL)'] },
          { label: 'Quantum NLP tools', items: ['lambeq', 'DisCoPy', 'DisCoCat diagrams', 'IQP ansatz'] },
          { label: 'Models & serving', items: ['Groq', 'OpenRouter', 'Python', 'FastAPI'] },
          { label: 'Ingestion', items: ['LaTeX-aware PDF parsing', 'table-preserving chunking', 'section metadata'] }
        ],
        decisions: [
          {
            n: '01', title: 'A LangGraph agent that picks its own tool, not a fixed RAG chain',
            decision: 'The agent runs on LangGraph and decides for itself whether a question needs the retrieval tool or one of the three lambeq tools.',
            why: 'The two kinds of question are different. "What ansatz did this paper use?" is retrieval. "Turn this sentence into a circuit" is computation over the sentence itself. A single fixed chain would answer both of them badly.',
            tradeoff: 'Routing can now fail on its own, separate from retrieval quality. It did fail, twice.'
          },
          {
            n: '02', title: 'Dense retrieval with bge-m3 in Qdrant, reranked',
            decision: 'BAAI/bge-m3 embeddings in Qdrant, with MMR search, multi-query retrieval and a cross-encoder reranker stacked on top.',
            why: 'Research papers restate the same idea in different vocabulary, so keyword matching misses paraphrases. MMR stops five near-identical chunks from filling the context, multi-query covers phrasings I did not anticipate, and the reranker fixes the order when the embedding model gets it slightly wrong.',
            tradeoff: 'Each stage adds latency, and the reranker is the most expensive single step in the path.'
          },
          {
            n: '03', title: 'A parser that refuses to split LaTeX and tables',
            decision: 'PDF parsing keeps LaTeX blocks and tables in one piece, so the text splitter cannot cut them in the middle.',
            why: 'A formula cut in half is worse than no formula. It still gets retrieved, but it reads as nonsense, and a citation does not catch that kind of error.',
            tradeoff: 'Chunk sizes are uneven, so some chunks are much larger than the target size.'
          },
          {
            n: '04', title: 'Build the eval set before tuning anything',
            decision: 'I wrote a 26-question test set across 3 papers and ran every change against it.',
            why: 'When I spot checked retrieval changes by hand they always looked like improvements. Twice the test set said the opposite. One of those times the model with the best keyword score was making up citations.',
            tradeoff: '26 questions is small. It catches regressions, but it cannot prove a small gain is real.'
          }
        ],
        problems: [
          {
            title: 'A Unicode bug was eating 11 points of recall', badge: 'Retrieval',
            problem: 'Recall on the eval set was well below what the chunk quality suggested it should be, with no obvious pattern in the misses.',
            cause: 'Characters were being mangled during PDF text extraction, so the stored text did not match what the query embedded to. You cannot see it by reading the chunks, but matching breaks.',
            fix: 'Normalised the extracted text at ingestion and reindexed. Recall recovered by about 11 points. I only found it because the test set gave me a number that looked wrong.'
          },
          {
            title: 'The best scoring model was making up its citations', badge: 'Grounding',
            problem: 'One model scored highest on keyword-overlap metrics, so on paper it was the obvious choice.',
            cause: 'It was producing fluent, plausible answers with citations that did not point at the passage the claim came from. Overlap scoring only checks the words, not where the claim came from.',
            fix: 'Checked citations against source passages instead of trusting the aggregate score, and moved to a more reliable model. The headline score went down, but the answers hold up.'
          },
          {
            title: 'A 55-minute stall with nothing in the logs', badge: 'Reliability',
            problem: 'A run hung for 55 minutes instead of answering or failing.',
            cause: 'A malformed function call coming back from the model provider, which the agent loop sat waiting on rather than rejecting.',
            fix: 'Traced it to the provider response, then handled malformed tool calls explicitly so a bad call fails fast instead of hanging the graph.'
          },
          {
            title: 'The agent kept reaching for the wrong tool', badge: 'Routing',
            problem: 'Questions were being routed to a tool that could not answer them.',
            cause: 'Two tools had effectively the same description, so the model had nothing to discriminate on.',
            fix: 'Rewrote the tool descriptions so each states what it does and what it is not for. Routing errors went away. The fix was in the tool descriptions, not in the graph.'
          }
        ],
        results: [
          'Answers are traceable to paper and section, so claims can be checked rather than trusted.',
          'The test set caught two failures that manual review had passed: the Unicode bug and the made up citations.',
          'Agent handles both retrieval questions and sentence-to-circuit requests through one interface.'
        ],
        limits: [
          'Not deployed. It runs locally.',
          'Only 3 papers indexed and 26 test questions, so both numbers are small.',
          'Multi-query plus reranking makes the slow path slower than a plain RAG chain.'
        ],
        future: [
          { label: 'Next up', items: [
            { title: 'Deploy behind the same FastAPI + Docker pattern as my other services', note: 'Weights and index outside the image, following what already works on EC2.' },
            { title: 'Grow the eval set past 100 questions', note: 'Enough to detect small regressions, not just large ones, and to cover multi-hop questions across papers.' }
          ]},
          { label: 'Then', items: [
            { title: 'Index the full QNLP corpus', note: 'Move from 3 papers to the whole reading list, which will stress retrieval far harder than the current set.' },
            { title: 'Render diagrams and circuits in the UI', note: 'Show the lambeq diagram and IQP circuit as images beside the answer instead of as text output.' }
          ]},
          { label: 'Further out', items: [
            { title: 'Faithfulness scoring in the harness', note: 'Score whether each claim is supported by its cited passage, so this kind of failure gets caught automatically next time.' }
          ]}
        ]
      },
      {
        id: 'hybrid',
        name: 'Hybrid Quantum-Classical NLP',
        tag: 'QNLP · PyTorch',
        status: 'Research · CDAC',
        blurb: 'An original hybrid model that compiles sentences into small quantum circuits and classifies their emotion with an LSTM head. Gradients flow end to end into the circuit parameters.',
        peek: ['lambeq', 'PennyLane', 'PyTorch', 'DisCoCat'],
        linkNote: 'Research project · code available on request',
        metrics: [
          { v: '81-100%', l: 'binary accuracy' },
          { v: '1,500+', l: 'circuits run' },
          { v: '~3,900', l: 'quantum parameters' },
          { v: '~5 s', l: 'experiment run, was 2 hours' }
        ],
        summary: [
          'My main research project during the CDAC internship: a model that turns English sentences into small quantum circuits and classifies their emotion with an LSTM on top.',
          'This is early stage research. The goal was not to beat a classical baseline. The goal was a hybrid pipeline that actually trains end to end, with gradients reaching the quantum parameters, and a clear account of where it breaks and why.'
        ],
        hasFlow: true,
        flowLabel: 'Training pipeline',
        flow: [
          { n: '01', step: 'CCG parse', note: 'Sentence to grammatical derivation.' },
          { n: '02', step: 'DisCoCat diagram', note: 'Derivation to string diagram, cached on disk.' },
          { n: '03', step: 'IQP ansatz', note: 'Diagram compiled to a parameterised quantum circuit.' },
          { n: '04', step: 'Circuit execution', note: 'Two quantum backends, ~3,900 trainable circuit parameters.' },
          { n: '05', step: 'LSTM head', note: 'Circuit outputs sequenced and classified.' },
          { n: '06', step: 'Parameter-shift backward', note: 'Gradients pushed back into the circuit parameters.' }
        ],
        stack: [
          { label: 'Quantum NLP', items: ['lambeq', 'PennyLane', 'DisCoPy', 'CCG parsing', 'DisCoCat', 'IQP ansatz'] },
          { label: 'Classical model', items: ['PyTorch', 'LSTM head', 'parameter-shift rule'] },
          { label: 'Evaluation', items: ['per-class precision / recall / F1', 'custom gradient-flow checker', '4 datasets', '2 backends'] },
          { label: 'Engineering', items: ['diagram + circuit caching', 'experiment harness', 'Python'] }
        ],
        decisions: [
          {
            n: '01', title: 'DisCoCat + IQP rather than an embedding fed into a circuit',
            decision: 'Sentences are compiled through CCG parsing into DisCoCat diagrams, then into IQP circuits, so the grammar decides the circuit structure.',
            why: 'If you just hand a classical embedding to a circuit, the quantum part is decoration. Compiling the grammar into the circuit is the part worth testing, and it keeps the model readable at the diagram level.',
            tradeoff: 'Circuit structure varies per sentence, so batching is awkward and anything unparseable drops out of the dataset.'
          },
          {
            n: '02', title: 'Parameter-shift gradients into the circuit, verified not assumed',
            decision: 'Trained the whole thing end to end with the parameter-shift rule, and built a tool that checks gradients actually reach the quantum parameters.',
            why: 'A hybrid model can look like it is training while the quantum block is frozen and the classical head does all the learning. Without a check, that result looks like success.',
            tradeoff: 'Parameter-shift is expensive: every parameter costs extra circuit evaluations per step.'
          },
          {
            n: '03', title: 'Cache the parsed diagrams and compiled circuits',
            decision: 'Parsing and circuit compilation results are cached on disk and reused across runs.',
            why: 'Parsing and compiling dominated runtime and the output is deterministic. Caching cut a two hour experiment to a few seconds, which is the difference between two runs a day and actually iterating.',
            tradeoff: 'The cache has to be invalidated by hand whenever the pipeline changes, and stale caches are a real hazard.'
          },
          {
            n: '04', title: 'Report per-class metrics, never aggregate accuracy',
            decision: 'All multi-class results are reported as per-class precision, recall and F1.',
            why: 'On the multi-class runs the accuracy looked fine while the model was at chance level. Recall was near zero on most emotion classes and one dominant class was hiding it.',
            tradeoff: 'The reported numbers look much worse than the accuracy figure did.'
          }
        ],
        problems: [
          {
            title: 'Multi-class accuracy looked fine and was chance-level', badge: 'Evaluation',
            problem: 'Multi-class runs reported plausible accuracy, suggesting the model was learning emotion classes.',
            cause: 'The metric was hiding the behaviour: near-zero recall across most classes, with the majority class carrying the number. On an imbalanced set, plain accuracy cannot tell this apart from real learning.',
            fix: 'Switched to per class precision, recall and F1 as the main numbers, so the failure is visible.'
          },
          {
            title: 'Gradients were not reaching the quantum parameters', badge: 'Training',
            problem: 'A later round of results collapsed for no visible reason after pipeline changes.',
            cause: 'Two causes together. A lot of examples were being dropped across pipeline stages, and a small tensor shape mistake was cutting the gradient path to the quantum parameters.',
            fix: 'Instrumented dataset counts at every stage to find the drops, fixed the tensor handling, and built a gradient-flow checker so a broken quantum gradient fails loudly now.'
          },
          {
            title: 'Experiments too slow to iterate on', badge: 'Throughput',
            problem: 'A full experiment took around two hours, so each idea cost most of a working session.',
            cause: 'CCG parsing and circuit compilation were being redone every run, though both are deterministic for a fixed dataset.',
            fix: 'Cached parsed diagrams and compiled circuits. Runtime dropped to a few seconds and I could run many more experiments per day.'
          }
        ],
        results: [
          '81 to 100% accuracy on binary classification, with gradients verified through to the circuit parameters.',
          'Over 1,500 circuits and ~3,900 quantum parameters exercised across 4 datasets and 2 backends.',
          'Caching turned a two hour experiment loop into a few seconds.',
          'Co-authored survey paper accepted for poster presentation at an IEEE conference at IIT Patna.'
        ],
        limits: [
          'Multi-class emotion classification does not work yet. Per class recall is near zero on most classes.',
          'Simulated backends and small circuits. Nothing here runs at a scale that competes with classical models.',
          'Unparseable sentences leave the dataset, which biases what the model ever sees.'
        ],
        future: [
          { label: 'Next up', items: [
            { title: 'Make multi-class actually learn', note: 'Class balancing and loss weighting first, then a larger ansatz, measured on per class recall and not on accuracy.' },
            { title: 'Ablate the quantum block', note: 'Run the LSTM head alone against the full hybrid, so I can say what the circuit actually adds.' }
          ]},
          { label: 'Then', items: [
            { title: 'Noise models and real hardware', note: 'Move past clean simulation to see what survives realistic noise on a small number of qubits.' },
            { title: 'Scale qubit count and dataset size', note: 'Currently bounded by simulation cost more than by method.' }
          ]},
          { label: 'Publication', items: [
            { title: 'Write up the hybrid architecture', note: 'The survey paper is accepted. The architecture result is the next write up, including the negative multi-class finding.' }
          ]}
        ]
      },
      {
        id: 'ticket',
        name: 'ML-Based Support Ticket Router',
        tag: 'NLP · Classification',
        status: 'Live',
        blurb: 'A DistilBERT ticket router with spam screening in front, sorting tickets into four teams, and turning away the ones that fit none of them.',
        peek: ['DistilBERT', 'FastAPI', 'Docker', 'HTTPS'],
        source: 'https://github.com/tathavms/lead_routing',
        demo: 'https://tatha-projects.duckdns.org/lead-routing/',
        metrics: [
          { v: '78.2%', l: 'test accuracy' },
          { v: '0.78', l: 'weighted F1' },
          { v: '~20k', l: 'held-out tickets' },
          { v: '$0', l: 'monthly cost' }
        ],
        summary: [
          'Built end to end with open-source tools: it takes an incoming ticket, screens it for spam, and sorts real tickets into Sales, Support, Billing or Customer Service. Tickets that match none of the four are rejected instead of being forced into the closest one.',
          'It is my own rebuild, from scratch, of a ticket-routing idea I first saw while testing a system at Dell in 2020. Random guessing across four classes is 25%. This reaches 78.2% accuracy and 0.78 weighted F1 on a held-out set of roughly 20,000 tickets.'
        ],
        hasFlow: true,
        flowLabel: 'Request path',
        flow: [
          { n: '01', step: 'Ticket submitted', note: 'FastAPI form or JSON endpoint.' },
          { n: '02', step: 'Spam screen', note: 'Pretrained classifier in front of the router.' },
          { n: '03', step: 'DistilBERT routing', note: 'Fine-tuned four-way classifier.' },
          { n: '04', step: 'Confidence + entropy gate', note: 'Two independent checks decide whether to accept the prediction.' },
          { n: '05', step: 'Route or reject', note: 'A team assignment, or an explicit "does not fit".' }
        ],
        stack: [
          { label: 'Model', items: ['DistilBERT (fine-tuned)', 'HuggingFace Transformers', 'Datasets', 'Evaluate', 'pretrained spam classifier'] },
          { label: 'Rejection logic', items: ['confidence thresholding', 'predictive-entropy check'] },
          { label: 'Serving', items: ['FastAPI', 'Uvicorn', 'Nginx reverse proxy', 'Docker'] },
          { label: 'TLS', items: ['HTTPS', "Let's Encrypt", 'Certbot auto-renewal', 'custom domain'] },
          { label: 'Infrastructure', items: ['AWS EC2 (free tier)', 'AWS S3', 'IAM roles', 'runtime weight mount'] },
          { label: 'CI/CD', items: ['GitHub Actions', 'GHCR', 'Git LFS'] }
        ],
        decisions: [
          {
            n: '01', title: 'Fine-tuned DistilBERT instead of prompting an LLM',
            decision: 'A fine-tuned DistilBERT does the four-way routing.',
            why: 'Routing is a small fixed set of classes with plenty of labelled examples, which is where a small fine tuned encoder works well. It runs on free tier CPU, costs nothing per request, and gives me probabilities I can set thresholds on. An LLM would cost money per ticket for a job a 66M parameter model already does well.',
            tradeoff: 'Adding a fifth team means retraining, where a prompt-based system would just need a new line in the prompt.'
          },
          {
            n: '02', title: 'Two independent rejection signals, not one threshold',
            decision: 'Unknown tickets are rejected using both a confidence check and an entropy check.',
            why: 'They catch different problems. A confidently wrong prediction passes a confidence check, while entropy catches the flat distribution where the model is hedging. With both checks a ticket has to look clear before it gets routed.',
            tradeoff: 'Two thresholds to tune, and stricter gating means more tickets fall through to manual triage.'
          },
          {
            n: '03', title: 'A spam classifier in front of the router',
            decision: 'A pretrained spam model screens every ticket before the router ever sees it.',
            why: 'Spam is not a routing category and training the router to recognise it would pollute the four real classes. Separating the two lets each be swapped or retrained independently.',
            tradeoff: 'An extra model to load and keep in memory on a very small instance.'
          },
          {
            n: '04', title: 'Model weights in S3, outside the Docker image',
            decision: 'Weights live in S3 and are mounted at runtime rather than baked into the image.',
            why: 'Shipping a new model needs no image rebuild and no CI run, just a new object in the bucket. It also keeps the image small enough to pull on free tier hardware.',
            tradeoff: 'A cold start now depends on S3 being reachable, so the container has a network dependency at boot.'
          },
          {
            n: '05', title: 'One free-tier EC2 instance shared with a second app',
            decision: 'Runs on a single free-tier EC2 box beside the sentiment service, fronted by one Nginx reverse proxy that serves both apps under separate paths on one domain over HTTPS, at no monthly cost.',
            why: 'A portfolio service should show the deployment work without costing money. Sharing one box forced me to be careful with memory, and that is the part I learned the most from.',
            tradeoff: 'No redundancy and no horizontal scaling. Both apps share a fate.'
          }
        ],
        problems: [
          {
            title: 'A data leak was inflating the test score', badge: 'Data',
            problem: 'Test metrics looked better than the model did on tickets I wrote by hand.',
            cause: 'Duplicated training examples were landing in both the train and test splits, so part of the test set had already been memorised.',
            fix: 'Deduplicated before splitting and re-evaluated. 78.2% accuracy and 0.78 weighted F1 are the numbers after the fix.'
          },
          {
            title: 'The spam model worked on email and failed on tickets', badge: 'Model choice',
            problem: 'The first spam classifier passed obvious junk straight through to the router.',
            cause: 'It was trained on corporate email. Support ticket spam is different in length, tone and structure, so this was a domain mismatch and not a model quality problem.',
            fix: 'Replaced it with a model that holds up on real ticket text, and made ticket-shaped spam part of my manual test pass.'
          },
          {
            title: 'Two ML apps on 1 GB without OOM kills', badge: 'Infrastructure',
            problem: 'Two transformer services on one free tier box need more memory than the box has.',
            cause: 'Weights baked into the images and loaded up front leave no headroom on a shared 1 GB instance.',
            fix: 'Moved weights to S3, mounted at runtime, kept a single model instance per process, and put Nginx in front to route both apps. It has run alongside the sentiment app without OOM crashes.'
          }
        ],
        results: [
          '78.2% accuracy and 0.78 weighted F1 across four classes, against a 25% random baseline.',
          'Explicit rejection path: unfitting tickets are turned away instead of misrouted.',
          'Served over HTTPS behind an Nginx reverse proxy with an auto-renewing Certbot certificate.',
          'Model updates ship by replacing an S3 object, with no image rebuild.',
          'Runs at zero monthly cost beside a second ML app.'
        ],
        limits: [
          'This is a portfolio deployment and not a production system. No real user traffic and no monitoring.',
          'Single instance, no redundancy or autoscaling.',
          'Rejection thresholds tuned on held-out data, not on live traffic.'
        ],
        future: [
          { label: 'Next up', items: [
            { title: 'Basic monitoring and structured request logging', note: 'The main gap in this project. Latency, error rate and rejection rate over time. The rejection rate is the early warning that the inputs have shifted.' },
            { title: 'Per-class error analysis on live-shaped inputs', note: 'Find which team pairs get confused most and whether it is a label problem or a model problem.' }
          ]},
          { label: 'Then', items: [
            { title: 'Feedback loop from corrections', note: 'Capture cases where a human reroutes a ticket and feed them back as training data.' },
            { title: 'Active learning on rejected tickets', note: 'Rejected tickets are the most useful unlabelled pool I have, so label those first.' }
          ]},
          { label: 'Further out', items: [
            { title: 'Drift detection on incoming text', note: 'Compare live input distribution against the training distribution and alert when it moves.' },
            { title: 'CPU inference optimisation', note: 'ONNX export and quantisation to cut latency and memory on the shared instance.' }
          ]}
        ]
      },
      {
        id: 'tweet',
        name: 'Tweet Sentiment Classifier',
        tag: 'NLP · Sentiment',
        status: 'Live',
        blurb: 'A sentiment web app and JSON API running DistilBERT on a CPU-only 1 GB server, answering in about 13 ms.',
        peek: ['DistilBERT', 'FastAPI', 'HTTPS', 'VADER'],
        source: 'https://github.com/tathavms/tweet_sentiment_analysis',
        demo: 'https://tatha-projects.duckdns.org/twitter/',
        metrics: [
          { v: '90.8%', l: 'validation accuracy' },
          { v: '~13 ms', l: 'warm response' },
          { v: '1 GB', l: 'shared instance' },
          { v: '0', l: 'OOM crashes' }
        ],
        summary: [
          'An end-to-end web app that labels short text positive or negative through either a web form or a JSON API, returning a label with a confidence score.',
          'Most of the work here was the engineering around the model rather than the model itself: getting a transformer to serve reliably on CPU-only hardware, sharing a 1 GB instance with a second ML app, and being precise about what the accuracy number actually measures.'
        ],
        hasFlow: false,
        stack: [
          { label: 'Model', items: ['DistilBERT (fine-tuned)', 'HuggingFace Transformers', 'CPU-only inference'] },
          { label: 'Labelling', items: ['VADER', 'weak supervision pipeline'] },
          { label: 'Serving', items: ['FastAPI', 'Uvicorn', 'Nginx reverse proxy', 'Docker', 'JSON API + web form'] },
          { label: 'TLS', items: ['HTTPS', "Let's Encrypt", 'Certbot auto-renewal', 'shared certificate'] },
          { label: 'Infrastructure', items: ['AWS EC2 (1 GB, shared)', 'AWS S3', 'runtime weight mount'] },
          { label: 'CI/CD', items: ['GitHub Actions', 'GHCR'] }
        ],
        decisions: [
          {
            n: '01', title: 'Weak supervision with VADER, and say so',
            decision: 'Training labels came from a VADER-based weak supervision pipeline, and the 90.8% validation accuracy is stated as measured against those labels, not against human judgement.',
            why: 'Hand-labelling enough tweets was not realistic for a solo project, and weak supervision gets a working model quickly. But the number then measures agreement with VADER, and reporting it as human validated accuracy would be wrong.',
            tradeoff: 'The model picks up VADER\'s blind spots, mainly sarcasm and negation, and the headline metric cannot show that.'
          },
          {
            n: '02', title: 'Fit DistilBERT into CPU-only, 1 GB serving',
            decision: 'Fine-tuned DistilBERT and tuned the serving path to run CPU-only on a 1 GB instance shared with another ML app.',
            why: 'The constraint was the interesting part. A distilled model, one instance per process and no GPU assumption keeps everything inside free tier limits and still answers in about 13 ms once warm.',
            tradeoff: 'No batching and no GPU headroom, so concurrent load queues instead of scaling.'
          },
          {
            n: '03', title: 'Weights in S3, mounted at runtime',
            decision: 'Model weights are kept out of the Docker image and pulled from S3 at container start.',
            why: 'Same reasoning as the router. The small image is why both apps fit on one box, and model updates need no rebuild.',
            tradeoff: 'Cold start depends on S3, and the first request after a restart is much slower than 13 ms.'
          },
          {
            n: '04', title: 'Form and API over the same handler',
            decision: 'The web form and the JSON API sit on one code path, differing only in response rendering.',
            why: 'A recruiter wants to click something. Another service wants JSON. With one inference path the demo and the API cannot drift apart.',
            tradeoff: 'The HTML page is plain on purpose.'
          }
        ],
        problems: [
          {
            title: 'A 1 GB box already running another transformer', badge: 'Infrastructure',
            problem: 'The sentiment app had to coexist with the ticket router without either being OOM-killed.',
            cause: 'Transformer weights inside the image plus eager loading in multiple workers exceeds 1 GB quickly.',
            fix: 'S3-mounted weights, a single model instance per process, conservative worker counts, and one Nginx reverse proxy routing both apps on one host, now terminating TLS for both. No OOM crashes since.'
          },
          {
            title: 'An accuracy number that could mislead', badge: 'Evaluation',
            problem: '90.8% validation accuracy reads like human validated performance and would be read that way.',
            cause: 'The validation labels came from the same VADER pipeline as the training labels, so the metric measures agreement with a rule-based tool.',
            fix: 'I say where the metric comes from everywhere it appears, and a human labelled evaluation set is the next step instead of relying on this number.'
          },
          {
            title: 'Slow first request after every restart', badge: 'Latency',
            problem: 'Warm responses are ~13 ms, but the first request after a deploy is far slower.',
            cause: 'Weights are fetched from S3 and the model initialised lazily on first use.',
            fix: 'Moved model loading into startup so the container warms before it accepts traffic, so the cost is paid at deploy time and not on a user request.'
          }
        ],
        results: [
          '~13 ms warm inference on CPU-only free-tier hardware.',
          'No OOM crashes while sharing a 1 GB instance with a second ML app.',
          'Served over HTTPS with an auto-renewing Certbot certificate, so no browser security warnings.',
          'Model updates ship without rebuilding the image.',
          'Form and API share one inference path, so they cannot disagree.'
        ],
        limits: [
          'Accuracy is measured against VADER labels, not human labels.',
          'Binary only. There is no neutral class, which short text really needs.',
          'Single small instance, no batching or autoscaling.'
        ],
        future: [
          { label: 'Next up', items: [
            { title: 'A human-labelled evaluation set', note: 'Even a few hundred hand labelled examples would replace the VADER agreement number with a real one and show the sarcasm and negation failures.' },
            { title: 'Add a neutral class', note: 'Forcing neutral text into positive or negative is the most common wrong answer this model gives.' }
          ]},
          { label: 'Then', items: [
            { title: 'ONNX export and quantisation', note: 'Lower memory and latency on the shared instance, leaving headroom for the router.' },
            { title: 'Confidence-based abstention', note: 'Return "unsure" instead of a coin flip label, reusing the entropy check from the ticket router.' }
          ]},
          { label: 'Further out', items: [
            { title: 'Request logging and drift checks', note: 'Track what real inputs look like versus training data, and how confidence distribution moves over time.' }
          ]}
        ]
      },
      {
        id: 'autotag',
        name: 'NLP Auto-Tagging & FAQ Chatbot',
        tag: 'NLP · POC',
        status: 'Planned',
        blurb: 'A proof of concept that suggests tags for digital assets from their title and description, with a lightweight FAQ chatbot on the same page.',
        peek: ['KeyBERT', 'sentence-transformers', 'FastAPI'],
        linkNote: 'Planned · not built yet',
        metrics: [
          { v: '2', l: 'features in scope' },
          { v: 'KeyBERT', l: 'tagging approach' },
          { v: 'FastAPI', l: 'serving' },
          { v: 'Planned', l: 'not built yet' }
        ],
        summary: [
          'A small proof of concept I am building on my own. It suggests tags for digital assets from their title and description, and puts a simple FAQ chatbot on the same page.',
          'The scope is small on purpose. The point is a working demo of asset tagging that reuses the deployment pattern from my two live services, not a new infrastructure exercise. This is written up as a plan, so the decisions below are the ones I have settled on before starting.'
        ],
        hasFlow: false,
        stack: [
          { label: 'Tag extraction', items: ['KeyBERT', 'keyphrase extraction', 'sentence-transformers', 'embedding similarity'] },
          { label: 'FAQ chatbot', items: ['embedding retrieval over a fixed FAQ set'] },
          { label: 'Serving', items: ['FastAPI form page', 'Docker', 'Nginx'] },
          { label: 'Infrastructure', items: ['AWS EC2 (existing instance)', 'AWS S3'] }
        ],
        decisions: [
          {
            n: '01', title: 'Keyphrase extraction plus similarity against a fixed tag list',
            decision: 'Tags come from KeyBERT keyphrase extraction combined with embedding similarity against a defined list of tag categories.',
            why: 'Free-form keyphrases alone produce inconsistent tags that no one can filter on. Scoring extracted phrases against a controlled vocabulary keeps the output usable while still surfacing phrases I did not anticipate.',
            tradeoff: 'The controlled vocabulary has to be maintained, and genuinely new concepts get mapped to the nearest existing tag.'
          },
          {
            n: '02', title: 'No fine-tuning for the first version',
            decision: 'Pretrained embeddings only, with no training step in v1.',
            why: 'There is no labelled tagging dataset yet, so a pretrained embedding baseline is the starting point. Using it also produces the first labelled data.',
            tradeoff: 'Domain-specific vocabulary will be handled worse than a fine-tuned model would handle it.'
          },
          {
            n: '03', title: 'Reuse the deployment pattern, do not invent one',
            decision: 'Served through a FastAPI form page following the same Docker, Nginx, S3 pattern as my other deployments.',
            why: 'That pattern is already proven on the same hardware. Reusing it means the effort goes into the tagging quality rather than into re-solving deployment.',
            tradeoff: 'Inherits the same single-instance limits as the other two services.'
          },
          {
            n: '04', title: 'Retrieval-based FAQ, not a generative one',
            decision: 'The chatbot answers from a fixed FAQ set via embedding retrieval rather than generating text.',
            why: 'For a small closed FAQ, retrieval returns an answer someone actually wrote, which cannot hallucinate. The generative version is only worth it once the question set outgrows the FAQ.',
            tradeoff: 'It cannot answer anything outside the FAQ, and paraphrase coverage depends entirely on the embedding model.'
          }
        ],
        results: [
          'The scope is small and already decided: two features, one page, one existing deployment pattern.',
          'Both features share one embedding model, keeping memory cost close to a single service.'
        ],
        limits: [
          'Not built yet. No code and no numbers.',
          'No labelled tag data, so v1 quality can only be judged by hand.',
          'FAQ answers are limited to what is in the fixed FAQ set.'
        ],
        future: [
          { label: 'Build order', items: [
            { title: 'Tag suggestion endpoint first', note: 'KeyBERT plus similarity against the tag vocabulary, behind a FastAPI form, judged on a hand-scored sample of assets.' },
            { title: 'FAQ retrieval on the same page', note: 'Reuse the loaded embedding model so the second feature costs almost no extra memory.' }
          ]},
          { label: 'Then', items: [
            { title: 'Human-in-the-loop tag review', note: 'Accept, reject or edit each suggested tag. That produces the labelled dataset I do not have today.' },
            { title: 'Evaluate against those labels', note: 'Precision at k on accepted tags, so quality is a measured number instead of an impression.' }
          ]},
          { label: 'Further out', items: [
            { title: 'Fine-tune once labels exist', note: 'Use the review data to fine-tune the embedding model on this vocabulary.' },
            { title: 'Bulk tagging over a whole asset library', note: 'Move from one at a time to batch, which is where it would actually save time.' }
          ]}
        ]
      }
];

const RESUME = 'resume/Tathagata_Banerjee_Resume.pdf';
const state = { id: null, card: null };

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
const themeLabel = () => (isDark() ? 'Light mode' : 'Dark mode');

function toggleTheme() {
  const dark = !isDark();
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  try { localStorage.setItem('pf-theme', dark ? 'dark' : 'light'); } catch (e) {}
  render();
}

/* ---------- list view ---------- */

const BIO = 'NLP and agentic-AI engineer with hands-on, end-to-end ML deployments: a transformer-based ticket router, a sentiment-classification API, and an agentic RAG system over quantum-NLP research papers, each with its own CI/CD and cloud setup. Backed by 8 years of software engineering in backend development and test automation at Dell Technologies and Accenture, including applied ML and NLP. Completed a research internship at CDAC building an original hybrid quantum-classical architecture for text classification with lambeq and PennyLane, with a survey paper accepted for poster presentation at an IEEE conference at IIT Patna.';

const CONTACT = [
  { label: 'Email', text: 'tathavms@gmail.com', href: 'mailto:tathavms@gmail.com' },
  { label: 'Phone', text: '+91 87770 81148', href: 'tel:+918777081148' },
  { label: 'LinkedIn', text: 'in/tatha-banerjee', href: 'https://www.linkedin.com/in/tatha-banerjee/' },
  { label: 'GitHub', text: 'github.com/tathavms', href: 'https://github.com/tathavms' }
];

function listHTML() {
  const card = state.card ? PROJECTS.find((p) => p.id === state.card) : null;
  return `
<div class="pg">
  <div class="topbar" style="justify-content:flex-end">
    <button class="btn" data-theme-toggle>${themeLabel()}</button>
  </div>

  <div class="hero">
    <div>
      <div class="idrow">
        <img class="portrait" src="assets/portrait-framed.png" alt="Tathagata Banerjee" width="88" height="88">
        <div>
          <h1 class="hname">Tathagata Banerjee</h1>
          <div class="tagline">Software Engineer · NLP &amp; Agentic AI · Quantum Computing</div>
        </div>
      </div>
      <p class="bio">${esc(BIO)}</p>
      <div class="actions">
        <a class="btn-solid" href="${RESUME}" target="_blank" rel="noopener">View resume</a>
        <a class="btn-ghost" href="${RESUME}" download>Download resume</a>
      </div>
    </div>

    <div class="panel">
      <div class="kicker ac" style="margin-bottom:18px">// contact</div>
      <div class="contact">
        ${CONTACT.map((c) => `
        <div class="cfield">
          <span class="clabel">${esc(c.label)}</span>
          <a href="${esc(c.href)}"${c.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(c.text)}</a>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="sechead projhead">
    <div class="kicker ac">// projects</div>
    <div class="m" style="font-size:12px;color:var(--mut)">${PROJECTS.length} projects · Full Write-ups Inside</div>
  </div>

  <div class="cards">${PROJECTS.map(cardHTML).join('')}</div>

  <div class="footer">
    <span>Bangalore, Karnataka, India</span>
    <span>tathavms@gmail.com</span>
  </div>
</div>
${card ? modalHTML(card) : ''}`;
}

function cardHTML(p) {
  return `
<div class="card" data-open-card="${esc(p.id)}">
  <div class="card-top">
    <span class="tag">${esc(p.tag)}</span>
    <span class="pill">${esc(p.status)}</span>
  </div>
  <div class="card-name">${esc(p.name)}</div>
  <div class="card-blurb">${esc(p.blurb)}</div>
  <div class="card-cta">Click to open →</div>
</div>`;
}

function modalHTML(p) {
  return `
<div class="scrim" data-scrim>
  <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(p.name)}">
    <div class="modal-top">
      <span class="tag">${esc(p.tag)}</span>
      <div class="right">
        <span class="pill">${esc(p.status)}</span>
        <button class="x" data-close aria-label="Close">✕</button>
      </div>
    </div>
    <h2>${esc(p.name)}</h2>
    <p class="modal-blurb">${esc(p.blurb)}</p>
    <div class="mmet">
      ${(p.metrics || []).map((m) => `<div><span class="v">${esc(m.v)}</span><span class="l">${esc(m.l)}</span></div>`).join('')}
    </div>
    <div class="chips">${(p.peek || []).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
    <div class="modal-actions">
      ${p.demo ? `<a class="abtn" href="${esc(p.demo)}" target="_blank" rel="noopener">Live ↗</a>` : ''}
      ${p.source ? `<a class="abtn" href="${esc(p.source)}" target="_blank" rel="noopener">Source code ↗</a>` : ''}
      <button class="abtn abtn-solid" data-detail="${esc(p.id)}">Project details →</button>
    </div>
    ${p.linkNote ? `<div class="note">${esc(p.linkNote)}</div>` : ''}
  </div>
</div>`;
}

/* ---------- detail view ---------- */

function detailHTML(p) {
  const i = PROJECTS.findIndex((x) => x.id === p.id);
  const next = i > -1 && i < PROJECTS.length - 1 ? PROJECTS[i + 1] : null;
  return `
<div class="stickybar">
  <div class="pg">
    <button class="btn btn-plain" data-back>← All projects</button>
    <div class="navright">
      <div class="secnav">
        <a href="#sec-overview">Overview</a>
        <a href="#sec-stack">Stack</a>
        <a href="#sec-decisions">Decisions</a>
        <a href="#sec-problems">Problems</a>
        <a href="#sec-next">What's Next</a>
      </div>
      <button class="btn" data-theme-toggle>${themeLabel()}</button>
    </div>
  </div>
</div>

<div class="pg pg-detail">
  <div class="dhead">
    <span class="tag" style="font-size:12.5px">${esc(p.tag)}</span>
    <span class="pill">${esc(p.status)}</span>
  </div>
  <h2 class="dtitle">${esc(p.name)}</h2>
  <p class="dlead">${esc(p.blurb)}</p>

  <div class="dactions">
    ${p.demo ? `<a class="btn-solid" href="${esc(p.demo)}" target="_blank" rel="noopener">Live service ↗</a>` : ''}
    ${p.source ? `<a class="btn-ghost" href="${esc(p.source)}" target="_blank" rel="noopener">Source ↗</a>` : ''}
    ${p.linkNote ? `<span class="note2">${esc(p.linkNote)}</span>` : ''}
  </div>

  <div class="metgrid">
    ${(p.metrics || []).map((m) => `<div class="met"><span class="v">${esc(m.v)}</span><span class="l">${esc(m.l)}</span></div>`).join('')}
  </div>

  <div class="sec first" id="sec-overview">
    <div class="kicker ac" style="padding-bottom:14px;border-bottom:1px solid var(--bd)">// overview</div>
    <div class="prose">${(p.summary || []).map((s) => `<p>${esc(s)}</p>`).join('')}</div>
    ${p.hasFlow ? `
    <div class="flow">
      <div class="flowlabel">${esc(p.flowLabel)}</div>
      <div class="flowlist">
        ${(p.flow || []).map((f) => `
        <div class="flowrow">
          <span class="n">${esc(f.n)}</span>
          <div>
            <div class="step">${esc(f.step)}</div>
            <div class="note3">${esc(f.note)}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>` : ''}
  </div>

  <div class="sec" id="sec-stack">
    <div class="kicker ac" style="padding-bottom:14px;border-bottom:1px solid var(--bd)">// tech stack</div>
    ${(p.stack || []).map((g) => `
    <div class="dl">
      <div class="k">${esc(g.label)}</div>
      <div class="chips2">${g.items.map((it) => `<span class="chip2">${esc(it)}</span>`).join('')}</div>
    </div>`).join('')}
  </div>

  <div class="sec" id="sec-decisions">
    <div class="sechead">
      <div class="kicker ac">// architecture decisions</div>
      <div class="secnav" style="color:var(--mut)">What · Why · Trade-off</div>
    </div>
    <div class="cardlist">
      ${(p.decisions || []).map((d) => `
      <div class="dec">
        <span class="n">${esc(d.n)}</span>
        <div style="max-width:760px">
          <h3>${esc(d.title)}</h3>
          <p>${esc(d.decision)}</p>
          <p class="why">${esc(d.why)}</p>
          ${d.tradeoff ? `<div class="to"><span class="k">Trade-off accepted</span><span class="v">${esc(d.tradeoff)}</span></div>` : ''}
        </div>
      </div>`).join('')}
    </div>
  </div>

  <div class="sec" id="sec-problems">
    <div class="sechead">
      <div class="kicker ac">// problems &amp; how I solved them</div>
      <div class="secnav" style="color:var(--mut)">Symptom · Root Cause · Fix</div>
    </div>
    <div class="cardlist">
      ${(p.problems || []).map((pb) => `
      <div class="pb">
        <div class="pb-top">
          <h3>${esc(pb.title)}</h3>
          <span class="pill">${esc(pb.badge)}</span>
        </div>
        <div class="pb-body">
          <div class="kv"><span class="k">Symptom</span><p>${esc(pb.problem)}</p></div>
          <div class="kv"><span class="k">Root cause</span><p>${esc(pb.cause)}</p></div>
          <div class="kv"><span class="k ac">Fix</span><p class="fix">${esc(pb.fix)}</p></div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <div class="sec">
    <div class="kicker ac" style="padding-bottom:14px;border-bottom:1px solid var(--bd)">// results &amp; limits</div>
    <div class="two">
      <div class="box">
        <div class="k">What worked</div>
        <ul>${(p.results || []).map((r) => `<li><span class="s">+</span><span>${esc(r)}</span></li>`).join('')}</ul>
      </div>
      <div class="box limits">
        <div class="k">Known limits</div>
        <ul>${(p.limits || []).map((l) => `<li><span class="s">−</span><span>${esc(l)}</span></li>`).join('')}</ul>
      </div>
    </div>
  </div>

  <div class="sec" id="sec-next">
    <div class="sechead">
      <div class="kicker ac">// direction &amp; planned updates</div>
      <div class="secnav" style="color:var(--mut)">Highest Leverage First</div>
    </div>
    ${(p.future || []).map((fg) => `
    <div class="fut">
      <div class="k">${esc(fg.label)}</div>
      <ul>${fg.items.map((it) => `
        <li>
          <span class="arw">→</span>
          <div>
            <div class="t">${esc(it.title)}</div>
            <div class="n2">${esc(it.note)}</div>
          </div>
        </li>`).join('')}</ul>
    </div>`).join('')}
  </div>

  <div class="navrow">
    <button class="btn ghost" data-back>← All projects</button>
    ${next ? `<button class="btn" data-detail="${esc(next.id)}" style="text-align:right">${esc(next.name)} →</button>` : ''}
  </div>
</div>`;
}

/* ---------- routing + events ---------- */

function readHash() {
  const m = /^#\/p\/(.+)$/.exec(location.hash || '');
  const id = m && PROJECTS.some((p) => p.id === m[1]) ? m[1] : null;
  if (id !== state.id) { state.id = id; state.card = null; return true; }
  return false;
}

function render() {
  const p = state.id ? PROJECTS.find((x) => x.id === state.id) : null;
  document.getElementById('app').innerHTML = p ? detailHTML(p) : listHTML();
  document.title = p ? p.name + ' — Tathagata Banerjee' : 'Tathagata Banerjee — Selected Work';
}

document.addEventListener('click', (e) => {
  const t = e.target;
  const hit = (sel) => t.closest(sel);

  if (hit('[data-theme-toggle]')) { toggleTheme(); return; }

  const detail = hit('[data-detail]');
  if (detail) {
    state.card = null;
    location.hash = '#/p/' + detail.getAttribute('data-detail');
    window.scrollTo(0, 0);
    return;
  }

  if (hit('[data-back]')) {
    state.card = null;
    if (location.hash) location.hash = '';
    else { state.id = null; render(); }
    window.scrollTo(0, 0);
    return;
  }

  if (hit('[data-close]') || t.hasAttribute('data-scrim')) { state.card = null; render(); return; }

  const card = hit('[data-open-card]');
  if (card) { state.card = card.getAttribute('data-open-card'); render(); }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.card) { state.card = null; render(); }
});

window.addEventListener('hashchange', () => {
  const isSection = /^#sec-/.test(location.hash || '');
  if (isSection) return;
  readHash();
  render();
  window.scrollTo(0, 0);
});

readHash();
render();
