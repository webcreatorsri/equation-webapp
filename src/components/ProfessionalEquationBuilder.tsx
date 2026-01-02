import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db, googleProvider } from '../firebase';
import { signOut, signInWithPopup } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

import {
  Download,
  Copy,
  FileText,
    Upload,        // Add this line
  CheckCircle,   // Add this line too (for the publish success modal)
  Code,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Zap,
  Lightbulb,
  Star,
  Sparkles,
  BookOpen,
  History,
  Loader2,
  X,
  Menu,
  Maximize2,
  Minimize2,
  Search,
  Camera,
  LogIn,
  Share2,
  Grid,
  Grid as Matrix,
  LineChart,
  Play,
  Square,
  Sliders,
  RefreshCcw
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as math from 'mathjs';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Declare MathJax global
declare global {
  interface Window {
    MathJax: {
      typesetPromise?: (elements: Element[]) => Promise<void>;
      typesetClear?: (elements: Element[]) => void;
      startup?: {
        ready: () => void;
        defaultReady: () => void;
      };
      tex: {
        inlineMath: string[][];
        displayMath: string[][];
        macros: Record<string, string>;
      };
    };
  }
}

type ExportFormat = 'latex' | 'word' | 'html' | 'plain';
type Field = 'mathematics' | 'physics' | 'chemistry' | 'biology' | 'ml' | 'engineering' | 'economics' | 'statistics' | 'computer-science' | 'quantum' | 'astronomy' | 'finance';
type CitationFormat = 'apa' | 'ieee' | 'harvard' | 'mla' | 'chicago';
type PlotType = '2d' | '3d' | 'polar' | 'parametric';

interface EquationHistory {
  equation: string;
  citations: string[];
  timestamp: Date;
  plotData?: any;
}

interface EquationInfo {
  name: string;
  field: string;
  description: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
  variables: string[];
}

interface SimilarEquation {
  name: string;
  field: string;
  latex: string;
  description: string;
  similarity: number;
}

interface PlotConfig {
  type: PlotType;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  step: number;
  showGrid: boolean;
  showLegend: boolean;
  color: string;
}

const ProfessionalEquationBuilder: React.FC = () => {
  const [selectedField, setSelectedField] = useState<Field>('mathematics');
  const [latexInput, setLatexInput] = useState<string>('');
  const [currentEquation, setCurrentEquation] = useState<string>('');
  const [copiedFormat, setCopiedFormat] = useState<ExportFormat | ''>('');
  const [showExpandedToolbar, setShowExpandedToolbar] = useState<boolean>(false);
  const [activeToolbarCategory, setActiveToolbarCategory] = useState<string>('operators');
  const [showShortcuts, setShowShortcuts] = useState<boolean>(true);
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [citations, setCitations] = useState<string[]>([]);
  const [loadingCitation, setLoadingCitation] = useState<boolean>(false);
  const [citationFormat, setCitationFormat] = useState<CitationFormat>('apa');
  const [showCitations, setShowCitations] = useState<boolean>(true);
  const [equationHistory, setEquationHistory] = useState<EquationHistory[]>([]);
  const [currentEquationInfo, setCurrentEquationInfo] = useState<EquationInfo | null>(null);
  const [similarEquations, setSimilarEquations] = useState<SimilarEquation[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState<boolean>(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState<boolean>(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState<boolean>(false);
  const [previewExpanded, setPreviewExpanded] = useState<boolean>(false);
  const [activeAITab, setActiveAITab] = useState<'info' | 'citations' | 'history' | 'similar' | 'analysis' | 'plot'>('info');
  const [activeLeftTab, setActiveLeftTab] = useState<'symbols' | 'templates' | 'shortcuts' | 'matrices' | 'operations'>('symbols');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [mathJaxLoaded, setMathJaxLoaded] = useState<boolean>(false);
  const [equationAnalysis, setEquationAnalysis] = useState<string>('');
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
  const [plotData, setPlotData] = useState<any>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
const [equationName, setEquationName] = useState('');
const [equationDescription, setEquationDescription] = useState('');
const [isPublishing, setIsPublishing] = useState(false);
const [publishError, setPublishError] = useState<string | null>(null);
  const [plotConfig, setPlotConfig] = useState<PlotConfig>({
    type: '2d',
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    step: 0.1,
    showGrid: true,
    showLegend: true,
    color: '#3b82f6'
  });
  const [isPlotting, setIsPlotting] = useState<boolean>(false);
  const [plotError, setPlotError] = useState<string>('');
  const [activePreviewTab, setActivePreviewTab] = useState<'equation' | 'plot'>('equation');

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const symbolsContainerRef = useRef<HTMLDivElement>(null);
  const templatesContainerRef = useRef<HTMLDivElement>(null);
  const shortcutsContainerRef = useRef<HTMLDivElement>(null);
  const aiContentRef = useRef<HTMLDivElement>(null);
  const plotContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini AI with proper error handling
  const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
  const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handlePublish = async () => {
  if (!auth.currentUser) {
    setPublishError('Please log in to publish an equation.');
    return;
  }
  if (!currentEquation.trim() || !equationName.trim()) {
    setPublishError('Equation name and content are required.');
    return;
  }
  setIsPublishing(true);
  setPublishError(null);
  try {
    const equationData = {
      latex: currentEquation,
      name: equationName,
      description: equationDescription || 'No description',
      userId: auth.currentUser.uid,
      username: auth.currentUser.displayName || 'Anonymous',
      timestamp: new Date(),
      upvotes: 0,
    };
    await setDoc(doc(collection(db, 'publicEquations'), Date.now().toString()), equationData);
    setShowPublishModal(false);
    setEquationName('');
    setEquationDescription('');
    navigate('/gallery'); // Navigate to gallery page
  } catch (error) {
    console.error('Publish error:', error);
    setPublishError('Failed to publish. Please try again.');
  } finally {
    setIsPublishing(false);
  }
};
  const handleShare = () => {
    if (!currentEquation) return;

    const encodedEquation = encodeURIComponent(currentEquation);
    const shareUrl = `${window.location.origin}/?equation=${encodedEquation}`;

    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Save equation history to Firestore
  const saveEquationHistory = async (historyEntry: EquationHistory) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, 'equationHistory', user.uid);
        const userDoc = await getDoc(userDocRef);
        const currentHistory = userDoc.exists() ? userDoc.data().history || [] : [];

        const updatedHistory = [historyEntry, ...currentHistory].slice(0, 20);
        await setDoc(userDocRef, { history: updatedHistory }, { merge: true });
      } catch (error) {
        console.error('Error saving equation history:', error);
      }
    }
  };

  // Load equation history from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, 'equationHistory', user.uid);
      const unsubscribe = onSnapshot(userDocRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setEquationHistory(data.history || []);
          } else {
            setEquationHistory([]);
          }
        }, 
        (error) => {
          console.error('Error fetching history:', error);
          setEquationHistory([]);
        }
      );

      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    const equationParam = searchParams.get('equation');
    if (equationParam) {
      try {
        const decodedEquation = decodeURIComponent(equationParam);
        setLatexInput(decodedEquation);
        setCurrentEquation(decodedEquation);
      } catch (error) {
        console.error('Error decoding equation parameter:', error);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // Check if MathJax is already loaded
    if (window.MathJax) {
      setMathJaxLoaded(true);
      return;
    }

    // Configure MathJax before loading the script
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        macros: {
          argmin: '\\operatorname*{argmin}',
          argmax: '\\operatorname*{argmax}',
          grad: '\\nabla',
          curl: '\\nabla\\times',
          div: '\\nabla\\cdot',
          laplacian: '\\nabla^2',
          RR: '\\mathbb{R}',
          NN: '\\mathbb{N}',
          ZZ: '\\mathbb{Z}',
          QQ: '\\mathbb{Q}',
          CC: '\\mathbb{C}',
          PP: '\\mathbb{P}',
          HH: '\\mathbb{H}',
          dd: '\\mathrm{d}',
          ee: '\\mathrm{e}',
          ii: '\\mathrm{i}',
          jj: '\\mathrm{j}',
          tr: '\\operatorname{tr}',
          rank: '\\operatorname{rank}',
          det: '\\det',
          dim: '\\dim',
          ker: '\\ker',
          coker: '\\operatorname{coker}',
          im: '\\operatorname{im}',
          Re: '\\operatorname{Re}',
          Im: '\\operatorname{Im}',
          Res: '\\operatorname{Res}',
          sgn: '\\operatorname{sgn}',
          diag: '\\operatorname{diag}',
          span: '\\operatorname{span}',
          vol: '\\operatorname{vol}',
          area: '\\operatorname{area}',
          lcm: '\\operatorname{lcm}',
          gcd: '\\operatorname{gcd}',
        },
      },
      startup: {
        ready: () => {
          if (window.MathJax.startup?.defaultReady) {
            window.MathJax.startup.defaultReady();
          }
          setMathJaxLoaded(true);
          console.log('✅ MathJax loaded and ready');
        },
      },
    };

    // Load MathJax script dynamically only if not already present
    if (!document.querySelector('script[src*="mathjax"]')) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
      script.async = true;
      script.onload = () => console.log("MathJax loaded successfully");
      script.onerror = () => {
        console.error("❌ Failed to load MathJax");
        setMathJaxLoaded(false);
      };
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup only if we added the script
      const mathjaxScript = document.querySelector('script[src*="mathjax"]');
      if (mathjaxScript && mathjaxScript.parentNode) {
        mathjaxScript.parentNode.removeChild(mathjaxScript);
      }
    };
  }, []);

  // Typeset MathJax when components update
  useEffect(() => {
    if (!mathJaxLoaded || !window.MathJax?.typesetPromise) return;

    const elements = [];
    if (previewRef.current) elements.push(previewRef.current);
    if (symbolsContainerRef.current) elements.push(symbolsContainerRef.current);
    if (templatesContainerRef.current) elements.push(templatesContainerRef.current);
    if (shortcutsContainerRef.current) elements.push(shortcutsContainerRef.current);
    if (aiContentRef.current) elements.push(aiContentRef.current);

    if (elements.length > 0) {
      if (window.MathJax.typesetClear) {
        window.MathJax.typesetClear(elements);
      }
      window.MathJax.typesetPromise(elements).catch((err: any) => {
        console.error('MathJax rendering error:', err);
      });
    }
  }, [currentEquation, activeLeftTab, activeAITab, selectedField, searchQuery, similarEquations, mathJaxLoaded]);

  // Generate plot data from equation
  const generatePlotData = async (equation: string) => {
    if (!equation.trim()) return null;
    
    setIsPlotting(true);
    setPlotError('');
    
    try {
      // Extract variables and create a plottable function
      const cleanEquation = equation
        .replace(/\\/g, '')
        .replace(/\{/g, '(')
        .replace(/\}/g, ')')
        .replace(/\^/g, '**')
        .replace(/\\frac{([^}]*)}{([^}]*)}/g, '($1)/($2)')
        .replace(/\\sqrt{([^}]*)}/g, 'sqrt($1)')
        .replace(/\\sqrt\[([^}]*)\]{([^}]*)}/g, '($2)**(1/($1))')
        .replace(/\\sin/g, 'sin')
        .replace(/\\cos/g, 'cos')
        .replace(/\\tan/g, 'tan')
        .replace(/\\log/g, 'log')
        .replace(/\\ln/g, 'log')
        .replace(/\\exp/g, 'exp');
      
      const { xMin, xMax, step } = plotConfig;
      const labels = [];
      const data = [];
      
      for (let x = xMin; x <= xMax; x += step) {
        try {
          // Replace variables with current x value
          let expression = cleanEquation
            .replace(/x/g, `(${x})`)
            .replace(/y/g, `(${x})`);
          
          // Evaluate the expression
          const result = math.evaluate(expression);
          labels.push(parseFloat(x.toFixed(2)));
          data.push(typeof result === 'number' ? result : NaN);
        } catch (error) {
          labels.push(parseFloat(x.toFixed(2)));
          data.push(NaN);
        }
      }
      
      const chartData = {
        labels,
        datasets: [
          {
            label: `f(x) = ${equation}`,
            data,
            borderColor: plotConfig.color,
            backgroundColor: `${plotConfig.color}20`,
            borderWidth: 3,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
          },
        ],
      };
      
      setPlotData(chartData);
      return chartData;
    } catch (error) {
      console.error('Error generating plot:', error);
      setPlotError('Unable to generate plot for this equation. Try simplifying or using different variables.');
      return null;
    } finally {
      setIsPlotting(false);
    }
  };

  const generateCitations = async (equation: string): Promise<string[]> => {
    if (!equation.trim() || equation.length < 3) return [];
    if (!genAI) {
      return ['Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY.'];
    }
    
    setLoadingCitation(true);
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `
As an academic citation expert, please provide accurate citations for the mathematical equation: "${equation}"

Requirements:
1. Identify the equation and its significance
2. Provide 8-12 most relevant and historically important citations (aim for at least 10)
3. Format in ${citationFormat.toUpperCase()} style
4. Include original discoverer/creator if known
5. Include key papers that developed or applied this equation
6. Include foundational textbook references
7. Include recent significant applications or extensions

Format your response as a JSON array of citation strings:
["citation1", "citation2", "citation3"]

Example for E=mc²:
["Einstein, A. (1905). Does the inertia of a body depend upon its energy content? Annalen der Physik, 17(10), 639-641.", "Einstein, A. (1905). Zur Elektrodynamik bewegter Körper. Annalen der Physik, 17(10), 891-921."]
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      try {
        let cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const citationArray = JSON.parse(cleanText);
        return Array.isArray(citationArray) ? citationArray : [responseText];
      } catch (parseError) {
        const citations = responseText
          .split('\n')
          .filter((line: string) => line.trim().length > 10)
          .map((line: string) => line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
          .filter((line: string) => line.length > 0);
        return citations.length > 0 ? citations : ['No valid citations found'];
      }
    } catch (error) {
      console.error('Error generating citations:', error);
      return [`Error: ${error instanceof Error ? error.message : 'Unable to generate citations'}`];
    } finally {
      setLoadingCitation(false);
    }
  };

  const recognizeEquation = async (equation: string): Promise<EquationInfo> => {
    if (!equation.trim() || equation.length < 3) {
      return {
        name: 'Custom Equation',
        field: 'mathematics',
        description: 'User-defined mathematical expression',
        complexity: 'basic',
        variables: ['x']
      };
    }

    if (!genAI) {
      return {
        name: 'Custom Equation',
        field: 'mathematics',
        description: 'User-defined expression (API key required)',
        complexity: 'basic',
        variables: ['x']
      };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
Analyze this mathematical equation: "${equation}"

Provide JSON response:
{
  "name": "Official name of the equation/formula",
  "field": "Primary mathematical field",
  "description": "Brief explanation of meaning and usage",
  "complexity": "basic/intermediate/advanced",
  "variables": ["array of variables used"]
}
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      try {
        const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanText);
        return {
          name: parsed.name || 'Custom Equation',
          field: parsed.field || 'mathematics',
          description: parsed.description || 'User-defined expression',
          complexity: parsed.complexity || 'basic',
          variables: parsed.variables || ['x']
        };
      } catch {
        return {
          name: 'Custom Equation',
          field: 'mathematics',
          description: 'User-defined expression',
          complexity: 'basic',
          variables: ['x']
        };
      }
    } catch {
      return {
        name: 'Custom Equation',
        field: 'mathematics',
        description: 'User-defined expression',
        complexity: 'basic',
        variables: ['x']
      };
    }
  };

  const findSimilarEquations = async (equation: string): Promise<SimilarEquation[]> => {
    if (!equation.trim() || equation.length < 3) return [];
    if (!genAI) return [];
    
    setLoadingSimilar(true);
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `
Find 4-6 similar equations to "${equation}" across different mathematical fields.
Provide variations, generalizations, and related equations.

Format as JSON array of objects:
[
  {
    "name": "Equation name",
    "field": "Mathematical field",
    "latex": "LaTeX code",
    "description": "Brief description of relationship and application",
    "similarity": 0.85
  }
]
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      try {
        const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanText);
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Error finding similar equations:', error);
      return [];
    } finally {
      setLoadingSimilar(false);
    }
  };

const analyzeEquation = async (equation: string): Promise<string> => {
  if (!equation.trim() || equation.length < 3) return '';
  if (!genAI) return 'AI analysis requires API key configuration.';

  setLoadingAnalysis(true);
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
Provide a comprehensive mathematical analysis of this equation: "${equation}"

Include the following sections:
1. Mathematical Properties and Characteristics
2. Domain and Range Considerations
3. Special Cases and Simplifications
4. Real-World Applications
5. Computational Complexity
6. Related Mathematical Concepts

IMPORTANT FORMATTING RULES:
- Use plain text only, NO markdown symbols
- Use section headings followed by a colon
- Use numbered lists (1., 2., 3.) for points under each section
- Do NOT use asterisks (*), underscores (_), or other markdown symbols
- Separate sections with a blank line
- Keep the language clear and professional

Example format:
Mathematical Properties and Characteristics:
1. The equation exhibits linearity.
2. It satisfies the commutative property.

Domain and Range Considerations:
1. Domain encompasses all real numbers.
2. Range is restricted to non-negative values.
    `;

    const result = await model.generateContent(prompt);
    const analysisText = result.response.text();  // Add this line to get the text
    
    // Clean up any remaining markdown symbols
    const cleanedText = analysisText
      .replace(/\*\*/g, '')  // Remove bold markers
      .replace(/\*/g, '')    // Remove italic markers
      .replace(/__/g, '')    // Remove underline markers
      .replace(/_/g, '')     // Remove single underscores
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .trim();
    
    return cleanedText;
  } catch (error) {
    console.error('Error analyzing equation:', error);
    return `Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  } finally {
    setLoadingAnalysis(false);
  }
};

  useEffect(() => {
    let isMounted = true;
    
    const generateForEquation = async () => {
      if (currentEquation.trim().length > 5) {
        try {
          const [newCitations, equationInfo, similar, analysis, plotData] = await Promise.all([
            generateCitations(currentEquation),
            recognizeEquation(currentEquation),
            findSimilarEquations(currentEquation),
            analyzeEquation(currentEquation),
            generatePlotData(currentEquation),
          ]);
          
          if (isMounted) {
            setCitations(newCitations);
            setCurrentEquationInfo(equationInfo);
            setSimilarEquations(similar);
            setEquationAnalysis(analysis);
            setPlotData(plotData);
            
            const newEntry: EquationHistory = {
              equation: currentEquation,
              citations: newCitations,
              timestamp: new Date(),
              plotData: plotData,
            };
            setEquationHistory((prev) => [newEntry, ...prev].slice(0, 15));
            saveEquationHistory(newEntry);
          }
        } catch (error) {
          console.error('Error generating AI insights:', error);
        }
      } else {
        if (isMounted) {
          setCitations([]);
          setCurrentEquationInfo(null);
          setSimilarEquations([]);
          setEquationAnalysis('');
          setPlotData(null);
          setPlotError('');
        }
      }
    };

    const timeoutId = setTimeout(generateForEquation, 2000);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [currentEquation, citationFormat]);

  const basicShortcuts: Record<string, string> = {
    // Superscripts and subscripts
    'x2': 'x^2', 'x3': 'x^3', 'x4': 'x^4', 'x5': 'x^5', 'xn': 'x^n',
    'y2': 'y^2', 'y3': 'y^3', 'yn': 'y^n',
    'a2': 'a^2', 'b2': 'b^2', 'c2': 'c^2', 'd2': 'd^2',
    'e2': 'e^2', 'f2': 'f^2', 'g2': 'g^2', 'h2': 'h^2',
    'i2': 'i^2', 'j2': 'j^2', 'k2': 'k^2', 'l2': 'l^2',
    'm2': 'm^2', 'n2': 'n^2', 'o2': 'o^2', 'p2': 'p^2',
    'q2': 'q^2', 'r2': 'r^2', 's2': 's^2', 't2': 't^2',
    'u2': 'u^2', 'v2': 'v^2', 'w2': 'w^2', 'z2': 'z^2',
    
    // Fractions
    '//': '\\frac{}{}', '1/2': '\\frac{1}{2}', '1/3': '\\frac{1}{3}', '1/4': '\\frac{1}{4}',
    '2/3': '\\frac{2}{3}', '3/4': '\\frac{3}{4}', '1/5': '\\frac{1}{5}', '2/5': '\\frac{2}{5}',
    '3/5': '\\frac{3}{5}', '4/5': '\\frac{4}{5}', '1/8': '\\frac{1}{8}', '3/8': '\\frac{3}{8}',
    '5/8': '\\frac{5}{8}', '7/8': '\\frac{7}{8}',

    // Brackets and templates
    '^^': '^{}', '__': '_{}', '{{': '{ }', '((': '( )', '[[': '[ ]',
    '||': '| |', '<<': '\\langle \\rangle', '>>': '\\langle \\rangle',

    // Optimization
    'argmin': '\\argmin', 'argmax': '\\argmax', 'min': '\\min', 'max': '\\max',
    'sup': '\\sup', 'inf': '\\inf',

    // Roots
    'sqrt': '\\sqrt{}', 'cbrt': '\\sqrt[3]{}', 'nrt': '\\sqrt[]{}',

    // Calculus
    'int': '\\int', 'dint': '\\int_{}^{}', 'iint': '\\iint', 'iiint': '\\iiint',
    'oint': '\\oint', 'sum': '\\sum', 'prod': '\\prod', 'coprod': '\\coprod',
    'lim': '\\lim', 'limsup': '\\limsup', 'liminf': '\\liminf',
    'deriv': '\\frac{d}{dx}', 'pderiv': '\\frac{\\partial}{\\partial x}',
    'ddx': '\\frac{d}{dx}', 'ddy': '\\frac{d}{dy}', 'ddz': '\\frac{d}{dz}',
    'pdx': '\\frac{\\partial}{\\partial x}', 'pdy': '\\frac{\\partial}{\\partial y}', 'pdz': '\\frac{\\partial}{\\partial z}',

    // Trigonometry
    'sin': '\\sin', 'cos': '\\cos', 'tan': '\\tan', 'cot': '\\cot',
    'sec': '\\sec', 'csc': '\\csc', 'asin': '\\arcsin', 'acos': '\\arccos',
    'atan': '\\arctan', 'sinh': '\\sinh', 'cosh': '\\cosh',
    'tanh': '\\tanh', 'coth': '\\coth',

    // Logarithms and exponentials
    'log': '\\log', 'ln': '\\ln', 'lg': '\\lg', 'exp': '\\exp',
    'log10': '\\log_{10}', 'log2': '\\log_{2}',

    // Greek letters (lowercase)
    '@a': '\\alpha', '@b': '\\beta', '@g': '\\gamma', '@d': '\\delta',
    '@e': '\\epsilon', '@z': '\\zeta', '@h': '\\eta', '@t': '\\theta',
    '@i': '\\iota', '@k': '\\kappa', '@l': '\\lambda', '@m': '\\mu',
    '@n': '\\nu', '@x': '\\xi', '@p': '\\pi', '@r': '\\rho',
    '@s': '\\sigma', '@u': '\\tau', '@f': '\\phi', '@c': '\\chi',
    '@y': '\\psi', '@w': '\\omega', '@ve': '\\varepsilon', '@vt': '\\vartheta',
    '@vp': '\\varpi', '@vr': '\\varrho', '@vs': '\\varsigma', '@vf': '\\varphi',

   // Greek letters (uppercase)
// Greek letters (lowercase as fallback)
'@A': '\\alpha', '@B': '\\beta', '@G': '\\gamma', '@D': '\\delta',
'@E': '\\epsilon', '@Z': '\\zeta', '@H': '\\eta', '@T': '\\theta',
'@I': '\\iota', '@K': '\\kappa', '@L': '\\lambda', '@M': '\\mu',
'@N': '\\nu', '@X': '\\xi', '@P': '\\pi', '@R': '\\rho',
'@S': '\\sigma', '@U': '\\tau', '@F': '\\phi', '@C': '\\chi',
'@Y': '\\psi', '@W': '\\omega',

    // Relations and operators
    '>=': '\\geq', '<=': '\\leq', '!=': '\\neq', '~=': '\\approx',
    '==': '\\equiv', 'prop': '\\propto', '+-': '\\pm', '-+': '\\mp',
    '::': '\\therefore', '.:': '\\because', '...': '\\ldots', '***': '\\cdots',
    'inf': '\\infty', 'aleph': '\\aleph', 'nabla': '\\nabla', 'del': '\\partial',

    // Set theory
    'in': '\\in', '!in': '\\notin', 'sub': '\\subset', 'sup': '\\supset',
    'sube': '\\subseteq', 'supe': '\\supseteq', 'cup': '\\cup', 'cap': '\\cap',
    'set': '\\setminus', 'empty': '\\emptyset', 'A': '\\forall', 'E': '\\exists',
    '!E': '\\nexists',

    // Number sets
    'RR': '\\mathbb{R}', 'NN': '\\mathbb{N}', 'ZZ': '\\mathbb{Z}', 'QQ': '\\mathbb{Q}',
    'CC': '\\mathbb{C}', 'PP': '\\mathbb{P}', 'HH': '\\mathbb{H}',

    // Logic
    'and': '\\land', 'or': '\\lor', 'not': '\\neg', '=>': '\\Rightarrow',
    '<=>': '\\Leftrightarrow', 'top': '\\top', 'bot': '\\bot',
    'vdash': '\\vdash', 'dashv': '\\dashv',

    // Arrows
    '->': '\\rightarrow', '<-': '\\leftarrow', '<->': '\\leftrightarrow',
    '=>': '\\Rightarrow', '<=': '\\Leftarrow', '<=>': '\\Leftrightarrow',
    '|->': '\\mapsto', 'up': '\\uparrow', 'down': '\\downarrow',
    'updown': '\\updownarrow',

    // Vector and matrix operations
    'vec': '\\vec{}', 'hat': '\\hat{}', 'bar': '\\bar{}', 'tilde': '\\tilde{}',
    'dot': '\\dot{}', 'ddot': '\\ddot{}', 'over': '\\overrightarrow{}',
    'under': '\\underrightarrow{}', 'norm': '\\|\\|', 'abs': '| |',
    'floor': '\\lfloor \\rfloor', 'ceil': '\\lceil \\rceil',
     'tr': '\\tr', 'rank': '\\rank',

    // Special functions
    'erf': '\\operatorname{erf}', 'erfc': '\\operatorname{erfc}',
    'Ai': '\\operatorname{Ai}', 'Bi': '\\operatorname{Bi}',
    'Li': '\\operatorname{Li}', 'Si': '\\operatorname{Si}', 'Ci': '\\operatorname{Ci}',
    'sinc': '\\operatorname{sinc}', 'rect': '\\operatorname{rect}',
    'tri': '\\operatorname{tri}', 'sgn': '\\sgn',

    // Physics and engineering
    'hbar': '\\hbar', 'hbar': '\\hbar', 'planck': '\\hbar',
    'degree': '^{\\circ}', 'deg': '^{\\circ}', 'ang': '\\angle',
    'parallel': '\\parallel', 'perp': '\\perp',

    // Matrix templates
    'mat2': '\\begin{pmatrix}  &  \\\\  &  \\end{pmatrix}',
    'mat3': '\\begin{pmatrix}  &  &  \\\\  &  &  \\\\  &  &  \\end{pmatrix}',
    
    'pmat2': '\\begin{pmatrix}  &  \\\\  &  \\end{pmatrix}',
    'vmat2': '\\begin{vmatrix}  &  \\\\  &  \\end{vmatrix}',
    'cases': '\\begin{cases}  &  \\\\  &  \\end{cases}',
    'array': '\\begin{array}{cc}  &  \\\\  &  \\end{array}',

    // Spacing
    'space': '\\,', 'thinsp': '\\,', 'medsp': '\\:', 'thicksp': '\\;',
    'quad': '\\quad', 'qquad': '\\qquad', 'negsp': '\\!',

    // Advanced mathematics
    'fourier': '\\mathcal{F}', 'laplace': '\\mathcal{L}', 'ztrans': '\\mathcal{Z}',
    'dft': '\\mathcal{F}', 'fft': '\\mathcal{F}', 'conv': '\\ast',
    'corr': '\\star', 'autocorr': '\\star\\star', 'expect': '\\mathbb{E}',
    'variance': '\\mathbb{V}', 'probability': '\\mathbb{P}', 'distribution': '\\sim',
    'normal': '\\mathcal{N}', 'uniform': '\\mathcal{U}', 'poisson': '\\text{Poisson}',
    'binomial': '\\text{Bin}', 'gamma': '\\Gamma', 'beta': '\\mathrm{B}',
  };

  const equationTemplates: Record<Field, Record<string, string>> = {
    mathematics: {
      'Quadratic Formula': 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      'Pythagorean Theorem': 'a^2 + b^2 = c^2',
      'Euler Formula': 'e^{i\\theta} = \\cos(\\theta) + i\\sin(\\theta)',
      'Euler Identity': 'e^{i\\pi} + 1 = 0',
      'Binomial Theorem': '(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k',
      'Taylor Series': 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n',
      'Fourier Series': 'f(x) = \\frac{a_0}{2} + \\sum_{n=1}^{\\infty} [a_n \\cos(nx) + b_n \\sin(nx)]',
      'Cauchy-Schwarz': '|\\langle u,v \\rangle|^2 \\leq \\langle u,u \\rangle \\cdot \\langle v,v \\rangle',
      'Triangle Inequality': '|x + y| \\leq |x| + |y|',
      'Fundamental Theorem of Calculus': '\\int_a^b f\'(x) dx = f(b) - f(a)',
      'Green Theorem': '\\oint_C (L dx + M dy) = \\iint_D \\left(\\frac{\\partial M}{\\partial x} - \\frac{\\partial L}{\\partial y}\\right) dA',
      'Stokes Theorem': '\\oint_{\\partial S} \\vec{F} \\cdot d\\vec{r} = \\iint_S (\\nabla \\times \\vec{F}) \\cdot d\\vec{S}',
      'Laplace Equation': '\\nabla^2 \\phi = 0',
      'Poisson Equation': '\\nabla^2 \\phi = f',
      'Heat Equation': '\\frac{\\partial u}{\\partial t} = \\alpha \\nabla^2 u',
      'Wave Equation': '\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u',
    },
    physics: {
      'Newton Second Law': 'F = ma',
      'Energy-Mass Equivalence': 'E = mc^2',
      'Schrödinger Equation': 'i\\hbar \\frac{\\partial \\psi}{\\partial t} = \\hat{H}\\psi',
      'Time-Independent Schrödinger': '-\\frac{\\hbar^2}{2m} \\nabla^2 \\psi + V\\psi = E\\psi',
      'Maxwell Equations': '\\begin{cases} \\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\epsilon_0} \\\\ \\nabla \\cdot \\vec{B} = 0 \\\\ \\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t} \\\\ \\nabla \\times \\vec{B} = \\mu_0 \\vec{J} + \\mu_0\\epsilon_0 \\frac{\\partial \\vec{E}}{\\partial t} \\end{cases}',
      'Wave Equation': '\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u',
      'Heat Equation': '\\frac{\\partial u}{\\partial t} = \\alpha \\nabla^2 u',
      'Lorentz Force': '\\vec{F} = q(\\vec{E} + \\vec{v} \\times \\vec{B})',
      'Planck Energy': 'E = h\\nu',
      'Uncertainty Principle': '\\Delta x \\Delta p \\geq \\frac{\\hbar}{2}',
      'Einstein Field Equations': 'G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}',
      'Dirac Equation': '(i\\gamma^\\mu \\partial_\\mu - m)\\psi = 0',
      'Hamilton Equations': '\\begin{cases} \\frac{dq_i}{dt} = \\frac{\\partial H}{\\partial p_i} \\\\ \\frac{dp_i}{dt} = -\\frac{\\partial H}{\\partial q_i} \\end{cases}',
      'Lagrangian': 'L = T - V',
      'Navier-Stokes': '\\rho\\left(\\frac{\\partial \\vec{v}}{\\partial t} + \\vec{v} \\cdot \\nabla \\vec{v}\\right) = -\\nabla p + \\mu\\nabla^2 \\vec{v} + \\vec{f}',
    },
    ml: {
      'Linear Regression': 'y = \\theta_0 + \\theta_1 x + \\epsilon',
      'Logistic Regression': 'p = \\frac{1}{1 + e^{-(\\theta_0 + \\theta_1 x)}}',
      'Cost Function': 'J(\\theta) = \\frac{1}{2m} \\sum_{i=1}^{m} (h_\\theta(x^{(i)}) - y^{(i)})^2',
      'Gradient Descent': '\\theta_j := \\theta_j - \\alpha \\frac{\\partial}{\\partial \\theta_j} J(\\theta)',
      'Softmax': 'p_i = \\frac{e^{z_i}}{\\sum_{j=1}^{K} e^{z_j}}',
      'Cross Entropy': 'H(p,q) = -\\sum_{i=1}^{n} p(x_i) \\log q(x_i)',
      'Bayes Theorem': 'P(A|B) = \\frac{P(B|A)P(A)}{P(B)}',
      'KL Divergence': 'D_{KL}(P \\parallel Q) = \\sum_x P(x) \\log \\frac{P(x)}{Q(x)}',
      'ReLU': 'f(x) = \\max(0, x)',
      'Sigmoid': '\\sigma(x) = \\frac{1}{1 + e^{-x}}',
      'Tanh': '\\tanh(x) = \\frac{e^x - e^{-x}}{e^x + e^{-x}}',
      'Attention Mechanism': '\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V',
      'Transformer': '\\text{Output} = \\text{SoftMax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V',
    },
    chemistry: {
      'Ideal Gas Law': 'PV = nRT',
      'Henderson-Hasselbalch': 'pH = pK_a + \\log \\frac{[A^-]}{[HA]}',
      'Nernst Equation': 'E = E^0 - \\frac{RT}{nF} \\ln Q',
      'Rate Law': 'r = k[A]^m[B]^n',
      'Arrhenius Equation': 'k = A e^{-E_a/(RT)}',
      'Van der Waals': '(P + \\frac{an^2}{V^2})(V - nb) = nRT',
      'Boltzmann Distribution': '\\frac{N_i}{N} = \\frac{g_i e^{-\\epsilon_i/(kT)}}{Z}',
      'Schrödinger (Atomic)': '\\hat{H}\\psi = E\\psi',
      'Bragg Law': 'n\\lambda = 2d\\sin\\theta',
      'Beer-Lambert Law': 'A = \\epsilon l c',
    },
    biology: {
      'Hardy-Weinberg': 'p^2 + 2pq + q^2 = 1',
      'Michaelis-Menten': 'v = \\frac{V_{max}[S]}{K_m + [S]}',
      'Logistic Growth': '\\frac{dN}{dt} = rN\\left(1 - \\frac{N}{K}\\right)',
      'Exponential Growth': '\\frac{dN}{dt} = rN',
      'Lotka-Volterra': '\\begin{cases} \\frac{dx}{dt} = \\alpha x - \\beta xy \\\\ \\frac{dy}{dt} = \\delta xy - \\gamma y \\end{cases}',
      'Allometric Scaling': 'Y = Y_0 M^b',
      'Hill Equation': 'Y = \\frac{[X]^n}{K_d + [X]^n}',
      'Mendelian Ratio': '9:3:3:1',
    },
    engineering: {
      'Ohm Law': 'V = IR',
      'Power': 'P = VI = I^2R = \\frac{V^2}{R}',
      'Stress-Strain': '\\sigma = E\\epsilon',
      'Beam Deflection': '\\frac{d^2y}{dx^2} = \\frac{M(x)}{EI}',
      'Navier-Stokes': '\\rho\\left(\\frac{\\partial \\vec{v}}{\\partial t} + \\vec{v} \\cdot \\nabla \\vec{v}\\right) = -\\nabla p + \\mu\\nabla^2 \\vec{v} + \\vec{f}',
      'Heat Transfer': 'q = -k \\nabla T',
      'Bernoulli': '\\frac{1}{2}\\rho v^2 + \\rho g h + p = \\text{constant}',
      'Cantilever Beam': '\\delta = \\frac{FL^3}{3EI}',
      'Buckling Load': 'P_{cr} = \\frac{\\pi^2 EI}{(KL)^2}',
      'Reynolds Number': 'Re = \\frac{\\rho v L}{\\mu}',
    },
    economics: {
      'Present Value': 'PV = \\frac{FV}{(1+r)^n}',
      'Compound Interest': 'A = P(1 + \\frac{r}{n})^{nt}',
      'Elasticity': 'E = \\frac{\\% \\Delta Q}{\\% \\Delta P}',
      'Cobb-Douglas': 'Y = A L^\\alpha K^\\beta',
      'Black-Scholes': '\\frac{\\partial V}{\\partial t} + \\frac{1}{2}\\sigma^2 S^2 \\frac{\\partial^2 V}{\\partial S^2} + rS \\frac{\\partial V}{\\partial S} - rV = 0',
      'GDP': 'Y = C + I + G + (X - M)',
      'Phillips Curve': '\\pi = \\pi_e - \\beta(u - u_n) + \\nu',
      'Solow Growth': '\\frac{dk}{dt} = s f(k) - (n+g+\\delta)k',
      'IS-LM Model': '\\begin{cases} Y = C(Y - T) + I(r) + G \\\\ M/P = L(r, Y) \\end{cases}',
    },
    statistics: {
      'Normal Distribution': 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{1}{2}(\\frac{x-\\mu}{\\sigma})^2',
      'Bayes Theorem': 'P(A|B) = \\frac{P(B|A)P(A)}{P(B)}',
      'Expected Value': 'E[X] = \\sum_{i=1}^{n} x_i p_i',
      'Variance': 'Var(X) = E[(X - \\mu)^2] = E[X^2] - (E[X])^2',
      'Standard Error': 'SE = \\frac{\\sigma}{\\sqrt{n}}',
      'Chi-Square': '\\chi^2 = \\sum \\frac{(O_i - E_i)^2}{E_i}',
      'Correlation': '\\rho_{XY} = \\frac{Cov(X,Y)}{\\sigma_X \\sigma_Y}',
      'Linear Regression': 'y_i = \\beta_0 + \\beta_1 x_i + \\epsilon_i',
      'Central Limit Theorem': '\\bar{X} \\sim N(\\mu, \\frac{\\sigma^2}{n})',
      'Poisson Distribution': 'P(X=k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}',
      'Binomial Distribution': 'P(X=k) = \\binom{n}{k} p^k (1-p)^{n-k}',
    },
    'computer-science': {
      'Big O Notation': 'T(n) = O(f(n))',
      'Master Theorem': 'T(n) = aT(\\frac{n}{b}) + f(n)',
      'Shannon Entropy': 'H(X) = -\\sum_{i=1}^{n} P(x_i) \\log_b P(x_i)',
      'Bayes Classifier': 'P(Y|X) = \\frac{P(X|Y)P(Y)}{P(X)}',
      'TF-IDF': '\\text{tf-idf}(t,d) = \\text{tf}(t,d) \\times \\log\\frac{N}{\\text{df}(t)}',
      'PageRank': 'PR(A) = (1-d) + d \\sum_{i=1}^{n} \\frac{PR(T_i)}{C(T_i)}',
      'Backpropagation': '\\delta^{(l)} = ((W^{(l+1)})^T \\delta^{(l+1)}) \\odot f\'(z^{(l)})',
      'Softmax': '\\sigma(\\vec{z})_i = \\frac{e^{z_i}}{\\sum_{j=1}^K e^{z_j}}',
      'Cross-Entropy Loss': 'L = -\\frac{1}{N} \\sum_{i=1}^N \\sum_{j=1}^M y_{ij} \\log(\\hat{y}_{ij})',
    },
    quantum: {
      'Schrödinger Equation': 'i\\hbar \\frac{\\partial}{\\partial t} |\\psi(t)\\rangle = \\hat{H} |\\psi(t)\\rangle',
      'Heisenberg Uncertainty': '\\sigma_x \\sigma_p \\geq \\frac{\\hbar}{2}',
      'Pauli Matrices': '\\sigma_x = \\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix}, \\sigma_y = \\begin{pmatrix} 0 & -i \\\\ i & 0 \\end{pmatrix}, \\sigma_z = \\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix}',
      'Commutation Relations': '[\\hat{x}, \\hat{p}] = i\\hbar',
      'Quantum Harmonic Oscillator': 'E_n = \\hbar\\omega(n + \\frac{1}{2})',
      'Bell State': '|\\Phi^+\\rangle = \\frac{1}{\\sqrt{2}}(|00\\rangle + |11\\rangle)',
      'Quantum Gate': 'U = e^{-iHt}',
      'Density Matrix': '\\rho = \\sum_i p_i |\\psi_i\\rangle\\langle\\psi_i|',
    },
    astronomy: {
      'Kepler Third Law': 'T^2 = \\frac{4\\pi^2}{G(M+m)} a^3',
      'Hubble Law': 'v = H_0 d',
      'Schwarzschild Radius': 'r_s = \\frac{2GM}{c^2}',
      'Friedmann Equations': '\\left(\\frac{\\dot{a}}{a}\\right)^2 = \\frac{8\\pi G}{3}\\rho - \\frac{k c^2}{a^2}',
      'Stefan-Boltzmann': 'j^\\star = \\sigma T^4',
      'Planck Radiation': 'B_\\nu(\\nu, T) = \\frac{2h\\nu^3}{c^2} \\frac{1}{e^{h\\nu/(kT)} - 1}',
      'Redshift': 'z = \\frac{\\lambda_{\\text{obs}} - \\lambda_{\\text{emit}}}{\\lambda_{\\text{emit}}}',
    },
    finance: {
      'Compound Interest': 'A = P(1 + \\frac{r}{n})^{nt}',
      'Present Value': 'PV = \\frac{FV}{(1+r)^n}',
      'Black-Scholes': '\\frac{\\partial V}{\\partial t} + \\frac{1}{2}\\sigma^2 S^2 \\frac{\\partial^2 V}{\\partial S^2} + rS \\frac{\\partial V}{\\partial S} - rV = 0',
      'Capital Asset Pricing': 'E(R_i) = R_f + \\beta_i (E(R_m) - R_f)',
      'Option Pricing': 'C = S N(d_1) - K e^{-rT} N(d_2)',
      'Portfolio Variance': '\\sigma_p^2 = \\sum_{i=1}^n \\sum_{j=1}^n w_i w_j \\sigma_i \\sigma_j \\rho_{ij}',
      'Value at Risk': 'VaR = \\mu - z_{\\alpha} \\sigma',
    },
  };

  const symbolCategories: Record<string, string[]> = {
    'Basic Operators': [
      '+', '-', '\\times', '\\div', '\\pm', '\\mp', '\\cdot', '\\ast', 
      '\\star', '\\circ', '\\bullet', '\\oplus', '\\ominus', '\\otimes', 
      '\\oslash', '\\odot', '\\dagger', '\\ddagger', '\\amalg', '\\wr',
      '\\boxplus', '\\boxminus', '\\boxtimes', '\\boxdot'
    ],
    'Relations': [
      '=', '\\neq', '\\equiv', '\\sim', '\\simeq', '\\approx', '\\cong', 
      '\\propto', '\\asymp', '\\doteq', '\\models', '<', '>', '\\leq', 
      '\\geq', '\\ll', '\\gg', '\\prec', '\\succ', '\\preceq', '\\succeq',
      '\\subset', '\\supset', '\\subseteq', '\\supseteq', '\\in', '\\ni', 
      '\\notin', '\\parallel', '\\perp', '\\smile', '\\frown', '\\vdash', '\\dashv',
      '\\mid', '\\nmid', '\\parallel', '\\nparallel', '\\shortparallel', '\\nshortparallel'
    ],
    'Greek Letters (Lowercase)': [
      '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\varepsilon', 
      '\\zeta', '\\eta', '\\theta', '\\vartheta', '\\iota', '\\kappa', 
      '\\lambda', '\\mu', '\\nu', '\\xi', '\\pi', '\\varpi', '\\rho', 
      '\\varrho', '\\sigma', '\\varsigma', '\\tau', '\\phi', '\\varphi', 
      '\\chi', '\\psi', '\\omega', '\\digamma', '\\varkappa', '\\varsigma'
    ],
    'Greek Letters (Uppercase)': [
      '\\Gamma', '\\Delta', '\\Theta', '\\Lambda', '\\Xi', '\\Pi', 
      '\\Sigma', '\\Upsilon', '\\Phi', '\\Psi', '\\Omega'
    ],
    'Calculus & Analysis': [
      '\\int', '\\iint', '\\iiint', '\\oint',
      '\\sum', '\\prod', '\\coprod', '\\bigcup', '\\bigcap', '\\bigsqcup',
      '\\bigvee', '\\bigwedge', '\\bigodot', '\\bigoplus', '\\bigotimes',
      '\\lim', '\\limsup', '\\liminf', '\\sup', '\\inf', '\\max', '\\min',
      '\\argmin', '\\argmax', '\\partial', '\\nabla', '\\Delta', '\\infty',
      '\\prime', '\\backprime', '\\Re', '\\Im', '\\wp'
    ],
'Functions & Operators': [
  '\\sin', '\\cos', '\\tan', '\\cot', '\\sec', '\\csc',

  '\\sinh', '\\cosh', '\\tanh',
  
  '\\log', '\\ln', '\\exp',
 

    ],
    'Arrows': [
      '\\rightarrow', '\\leftarrow', '\\Rightarrow', '\\Leftarrow',
      '\\leftrightarrow', '\\Leftrightarrow', '\\mapsto', '\\to', '\\gets',
      '\\uparrow', '\\downarrow', '\\updownarrow', '\\Uparrow', '\\Downarrow',
      '\\Updownarrow', '\\nearrow', '\\searrow', '\\swarrow', '\\nwarrow',
      '\\hookrightarrow', '\\hookleftarrow', '\\leftharpoonup', '\\rightharpoonup',
      '\\leftharpoondown', '\\rightharpoondown', '\\rightleftharpoons',
      '\\longleftrightarrow', '\\Longleftrightarrow', '\\longrightarrow', '\\longleftarrow'
    ],
    'Set Theory & Number Systems': [
      '\\in', '\\notin', '\\ni', '\\subset', '\\supset', '\\subseteq', 
      '\\supseteq', '\\nsubseteq', '\\nsupseteq', '\\subsetneq', '\\supsetneq',
      '\\cup', '\\cap', '\\sqcup', '\\sqcap', '\\setminus', '\\smallsetminus',
      '\\triangle', '\\uplus', '\\bigcirc', '\\odot', '\\ominus',
      '\\emptyset', '\\varnothing', '\\mathbb{R}', '\\mathbb{N}', '\\mathbb{Z}',
      '\\mathbb{Q}', '\\mathbb{C}', '\\mathbb{P}', '\\mathbb{H}', '\\mathbb{A}',
      '\\forall', '\\exists', '\\nexists', '\\complement', '\\aleph', '\\beth'
    ],
    'Logic & Proof': [
      '\\land', '\\lor', '\\neg', '\\lnot', '\\wedge', '\\vee',
      '\\implies', '\\Rightarrow', '\\impliedby', '\\Leftarrow', 
      '\\iff', '\\Leftrightarrow', '\\top', '\\bot', '\\vdash', 
      '\\dashv', '\\models', '\\therefore', '\\because', '\\square', '\\blacksquare',
      '\\triangle', '\\blacktriangle', '\\diamond', '\\bullet', '\\circ',
      '\\Box', '\\Diamond'
    ],
    'Delimiters & Brackets': [
      '(', ')', '[', ']', '\\{', '\\}', '\\lbrace', '\\rbrace',
      '|', '\\|', '\\vert', '\\Vert', '\\langle', '\\rangle',
      '\\lceil', '\\rceil', '\\lfloor', '\\rfloor',
      '\\ulcorner', '\\urcorner', '\\llcorner', '\\lrcorner',
      '/', '\\backslash', '\\uparrow', '\\downarrow', '\\updownarrow',
      '\\lgroup', '\\rgroup', '\\lmoustache', '\\rmoustache'
    ],
    'Accents & Decorations': [
      '\\hat{a}', '\\bar{a}', '\\tilde{a}', '\\vec{a}', '\\dot{a}', '\\ddot{a}',
      '\\acute{a}', '\\grave{a}', '\\breve{a}', '\\check{a}', '\\mathring{a}',
      '\\widehat{abc}', '\\widetilde{abc}', '\\overleftarrow{abc}', 
      '\\overrightarrow{abc}', '\\overleftrightarrow{abc}',
      '\\underline{a}', '\\overline{a}', '\\overbrace{abc}', '\\underbrace{abc}',
      '\\sqrt{a}', '\\sqrt[n]{a}', '\\frac{a}{b}', '\\binom{a}{b}'
    ],
    'Special Symbols & Constants': [
      '\\hbar', '\\ell', '\\Re', '\\Im', '\\wp', '\\nabla', '\\triangle', 
      '\\Box', '\\Diamond', '\\angle', '\\measuredangle', '\\sphericalangle',
      '\\perp', '\\parallel', '\\nparallel', '\\shortparallel', '\\nshortparallel',
      '\\ldots', '\\cdots', '\\vdots', '\\ddots', 
      '\\aleph', '\\beth', '\\gimel', '\\daleth', '\\Finv', '\\Game',
      '\\S',   '\\yen', 
      '\\dagger', '\\ddagger', '\\mho', '\\eth', '\\partial', '\\imath', '\\jmath',
      '\\infty', '\\varnothing', '\\exists', '\\forall', '\\neg', '\\flat', '\\natural', '\\sharp'
    ],
    'Quantum & Physics': [
'\\chi', '\\omega',
],
 
    'Advanced Operations': [
    '\\mathcal{F}', '\\mathcal{L}', '\\mathcal{Z}', '\\mathcal{F}', '\\mathcal{F}',
'\\ast', '\\star', '\\star\\star', '\\mathbb{E}', '\\mathbb{V}', '\\mathbb{P}',
'\\sim', '\\mathcal{N}', '\\mathcal{U}', '\\text{Poisson}', '\\text{Bin}', '\\Gamma', '\\mathrm{B}',

'\\bigcap', '\\bigcup', '\\bigsqcup', '\\bigvee', '\\bigwedge', '\\bigodot', '\\bigoplus', '\\bigotimes',
'\\coprod', '\\biguplus', '\\prod', '\\sum', 
    ],
  };

  const matrixTemplates = {
    '2x2 Matrix': '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    '3x3 Matrix': '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}',
    '2x2 Determinant': '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
    '3x3 Determinant': '\\begin{vmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{vmatrix}',
    'Column Vector': '\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}',
    'Row Vector': '\\begin{pmatrix} x & y & z \\end{pmatrix}',
    'System of Equations': '\\begin{cases} ax + by = c \\\\ dx + ey = f \\end{cases}',
    'Augmented Matrix': '\\left[\\begin{array}{cc|c} a & b & c \\\\ d & e & f \\end{array}\\right]',
    'Block Matrix': '\\begin{pmatrix} A & B \\\\ C & D \\end{pmatrix}',
    'Identity Matrix': '\\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}',
    'Diagonal Matrix': '\\begin{pmatrix} a & 0 & 0 \\\\ 0 & b & 0 \\\\ 0 & 0 & c \\end{pmatrix}',
    'Jacobian Matrix': '\\begin{pmatrix} \\frac{\\partial f_1}{\\partial x_1} & \\cdots & \\frac{\\partial f_1}{\\partial x_n} \\\\ \\vdots & \\ddots & \\vdots \\\\ \\frac{\\partial f_m}{\\partial x_1} & \\cdots & \\frac{\\partial f_m}{\\partial x_n} \\end{pmatrix}',
    'Hessian Matrix': '\\begin{pmatrix} \\frac{\\partial^2 f}{\\partial x_1^2} & \\cdots & \\frac{\\partial^2 f}{\\partial x_1 \\partial x_n} \\\\ \\vdots & \\ddots & \\vdots \\\\ \\frac{\\partial^2 f}{\\partial x_n \\partial x_1} & \\cdots & \\frac{\\partial^2 f}{\\partial x_n^2} \\end{pmatrix}',
  };

  const advancedOperations = {
    'Fourier Transform': '\\mathcal{F}\\{f(t)\\} = \\int_{-\\infty}^{\\infty} f(t) e^{-i\\omega t} dt',
    'Inverse Fourier': '\\mathcal{F}^{-1}\\{F(\\omega)\\} = \\frac{1}{2\\pi} \\int_{-\\infty}^{\\infty} F(\\omega) e^{i\\omega t} d\\omega',
    'Laplace Transform': '\\mathcal{L}\\{f(t)\\} = \\int_0^\\infty f(t) e^{-st} dt',
    'Inverse Laplace': '\\mathcal{L}^{-1}\\{F(s)\\} = \\frac{1}{2\\pi i} \\lim_{T\\to\\infty} \\int_{\\gamma-iT}^{\\gamma+iT} F(s) e^{st} ds',
    'Z-Transform': '\\mathcal{Z}\\{x[n]\\} = \\sum_{n=-\\infty}^{\\infty} x[n] z^{-n}',
    'Convolution': '(f * g)(t) = \\int_{-\\infty}^{\\infty} f(\\tau) g(t-\\tau) d\\tau',
    'Correlation': '(f \\star g)(t) = \\int_{-\\infty}^{\\infty} f^*(\\tau) g(t+\\tau) d\\tau',
    'Autocorrelation': 'R_{ff}(\\tau) = \\int_{-\\infty}^{\\infty} f^*(t) f(t+\\tau) dt',
    'Expected Value': '\\mathbb{E}[X] = \\int_{-\\infty}^{\\infty} x f(x) dx',
    'Variance': '\\mathbb{V}[X] = \\mathbb{E}[(X-\\mu)^2]',
    'Covariance': '\\text{Cov}(X,Y) = \\mathbb{E}[(X-\\mu_X)(Y-\\mu_Y)]',
    'Probability': '\\mathbb{P}(A) = \\frac{\\text{Number of favorable outcomes}}{\\text{Total outcomes}}',
    'Normal Distribution': 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}',
    'Poisson Distribution': 'P(X=k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}',
    'Binomial Distribution': 'P(X=k) = \\binom{n}{k} p^k (1-p)^{n-k}',
  };

  const handleLatexChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLatexInput(value);
    setCurrentEquation(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (e.key === ' ') {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = latexInput.substring(0, cursorPos);

      const match = textBeforeCursor.match(/(\S+)$/);
      if (match) {
        const word = match[1];

        if (basicShortcuts[word]) {
          e.preventDefault();

          const replacement = basicShortcuts[word];
          const start = cursorPos - word.length;
          const newValue = latexInput.substring(0, start) + replacement + ' ' + latexInput.substring(cursorPos);

          setLatexInput(newValue);
          setCurrentEquation(newValue);

          setTimeout(() => {
            const newPos = start + replacement.length + 1;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
        } else {
          const expMatch = word.match(/^(\d+|[a-z])(\d+)$/i);
          if (expMatch) {
            e.preventDefault();
            const [, base, exp] = expMatch;
            const replacement = `${base}^{${exp}}`;
            const start = cursorPos - word.length;
            const newValue = latexInput.substring(0, start) + replacement + ' ' + latexInput.substring(cursorPos);
            setLatexInput(newValue);
            setCurrentEquation(newValue);
            setTimeout(() => {
              const newPos = start + replacement.length + 1;
              textarea.setSelectionRange(newPos, newPos);
            }, 0);
          }
        }
      }
    }

    if (e.key === '{') {
      e.preventDefault();
      insertBracketPair('{', '}');
    } else if (e.key === '(') {
      e.preventDefault();
      insertBracketPair('(', ')');
    } else if (e.key === '[') {
      e.preventDefault();
      insertBracketPair('[', ']');
    } else if (e.key === '|') {
      e.preventDefault();
      insertBracketPair('|', '|');
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        wrapSelection('\\mathbf{', '}');
      } else if (e.key === 'i') {
        e.preventDefault();
        wrapSelection('\\mathit{', '}');
      } else if (e.key === '/') {
        e.preventDefault();
        insertFraction();
      } else if (e.key === 'm') {
        e.preventDefault();
        insertMatrix('pmatrix', 2, 2);
      } else if (e.key === 'p') {
        e.preventDefault();
        setActivePreviewTab('plot');
      }
    }
  };

  const insertBracketPair = (open: string, close: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = latexInput;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    const newValue = before + open + selected + close + after;
    setLatexInput(newValue);
    setCurrentEquation(newValue);

    setTimeout(() => {
      if (selected.length > 0) {
        textarea.setSelectionRange(start + open.length, end + open.length);
      } else {
        textarea.setSelectionRange(start + open.length, start + open.length);
      }
    }, 0);
  };

  const wrapSelection = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = latexInput;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    const newValue = before + prefix + selected + suffix + after;
    setLatexInput(newValue);
    setCurrentEquation(newValue);

    setTimeout(() => {
      if (selected.length > 0) {
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }
    }, 0);
  };

  const insertFraction = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = latexInput;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    let newValue: string;
    let newPos: number;

    if (selected.length > 0) {
      newValue = before + '\\frac{' + selected + '}{}' + after;
      newPos = start + 6 + selected.length + 2;
    } else {
      newValue = before + '\\frac{}{}' + after;
      newPos = start + 6;
    }

    setLatexInput(newValue);
    setCurrentEquation(newValue);

    setTimeout(() => {
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertMatrix = (type: string, rows: number = 2, cols: number = 2) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = latexInput;
    
    let matrixTemplate = '';
    switch (type) {
      case 'pmatrix':
        matrixTemplate = `\\begin{pmatrix} ${' & '.repeat(cols - 1)} \\\\ ${' & '.repeat(cols - 1)} \\end{pmatrix}`;
        break;
      case 'bmatrix':
        matrixTemplate = `\\begin{bmatrix} ${' & '.repeat(cols - 1)} \\\\ ${' & '.repeat(cols - 1)} \\end{pmatrix}`;
        break;
      case 'matrix':
        matrixTemplate = `\\begin{matrix} ${' & '.repeat(cols - 1)} \\\\ ${' & '.repeat(cols - 1)} \\end{matrix}`;
        break;
      case 'vmatrix':
        matrixTemplate = `\\begin{vmatrix} ${' & '.repeat(cols - 1)} \\\\ ${' & '.repeat(cols - 1)} \\end{vmatrix}`;
        break;
      default:
        matrixTemplate = `\\begin{${type}} ${' & '.repeat(cols - 1)} \\\\ ${' & '.repeat(cols - 1)} \\end{${type}}`;
    }

    const newValue = text.substring(0, start) + matrixTemplate + text.substring(start);
    setLatexInput(newValue);
    setCurrentEquation(newValue);

    setTimeout(() => {
      const newPos = start + matrixTemplate.indexOf('&') - 1;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertSymbol = (symbol: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = latexInput;
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newValue = before + symbol + ' ' + after;
    setLatexInput(newValue);
    setCurrentEquation(newValue);

    setTimeout(() => {
      const newPos = start + symbol.length + 1;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertMatrixTemplate = (template: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = latexInput;

    const newValue = text.substring(0, start) + template + text.substring(start);
    setLatexInput(newValue);
    setCurrentEquation(newValue);

    setTimeout(() => {
      const newPos = start + template.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertAdvancedOperation = (operation: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = latexInput;

    const newValue = text.substring(0, start) + operation + text.substring(start);
    setLatexInput(newValue);
    setCurrentEquation(newValue);

    setTimeout(() => {
      const newPos = start + operation.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const loadTemplate = (templateKey: string) => {
    const template = equationTemplates[selectedField]?.[templateKey];
    if (template) {
      setLatexInput(template);
      setCurrentEquation(template);
      setSelectedTemplate(templateKey);
    }
  };

  const useSimilarEquation = (latex: string) => {
    setLatexInput(latex);
    setCurrentEquation(latex);
  };

  const clearEquation = () => {
    setLatexInput('');
    setCurrentEquation('');
    setSelectedTemplate('');
    setCitations([]);
    setCurrentEquationInfo(null);
    setSimilarEquations([]);
    setEquationAnalysis('');
    setPlotData(null);
    setPlotError('');
  };

  const regeneratePlot = async () => {
    if (currentEquation) {
      await generatePlotData(currentEquation);
    }
  };

  const copyToClipboard = async (format: ExportFormat) => {
    let content = '';
    switch (format) {
      case 'latex':
        content = currentEquation;
        break;
      case 'plain':
        content = currentEquation.replace(/\\[a-z]+/g, '');
        break;
      case 'html':
        content = `<div>$$${currentEquation}$$</div>`;
        break;
      case 'word':
        content = currentEquation;
        break;
    }

    await navigator.clipboard.writeText(content);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(''), 2000);
  };

  const downloadEquation = (format: ExportFormat) => {
    let content = '';
    let filename = '';
    let mimeType = 'text/plain';

    switch (format) {
      case 'latex':
        content = `\\documentclass{article}\n\\begin{document}\n$$${currentEquation}$$\n\\end{document}`;
        filename = 'equation.tex';
        break;
      case 'html':
        content = `<!DOCTYPE html><html><head><script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script></head><body><div>$$${currentEquation}$$</div></body></html>`;
        filename = 'equation.html';
        mimeType = 'text/html';
        break;
      default:
        content = currentEquation;
        filename = 'equation.txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsImage = async () => {
  if (!previewRef.current || !currentEquation) return;

  setIsExportingImage(true);
  try {
    // Create a temporary container for better rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: fixed;
      left: -9999px;
      top: -9999px;
      background: white;
      padding: 40px;
      border-radius: 12px;
      font-size: 2rem;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 400px;
      min-height: 200px;
    `;
    
    // Copy the equation content
    tempContainer.innerHTML = previewRef.current.innerHTML;
    
    // Add to DOM temporarily
    document.body.appendChild(tempContainer);

    // Wait for MathJax to render if needed
    if (window.MathJax?.typesetPromise) {
      await window.MathJax.typesetPromise([tempContainer]);
    }

    // Additional delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(tempContainer, {
      backgroundColor: '#ffffff',
      scale: 4, // Higher scale for better quality
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: tempContainer.scrollWidth,
      height: tempContainer.scrollHeight,
      onclone: (clonedDoc) => {
        // Ensure MathJax renders in the cloned document
        const clonedContainer = clonedDoc.querySelector('div');
        if (clonedContainer) {
          clonedContainer.style.cssText = tempContainer.style.cssText;
        }
      }
    });

    // Clean up temporary container
    document.body.removeChild(tempContainer);

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `equation-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setIsExportingImage(false);
    }, 'image/png', 1.0); // Maximum quality

  } catch (error) {
    console.error('Error exporting image:', error);
    
    // Fallback: try with the original element
    try {
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `equation-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setIsExportingImage(false);
      }, 'image/png');
    } catch (fallbackError) {
      console.error('Fallback export also failed:', fallbackError);
      setIsExportingImage(false);
    }
  }
};
  const filteredShortcuts = Object.entries(basicShortcuts).filter(([key, value]) =>
    key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const aiTabs = [
    { key: 'info' as const, icon: Lightbulb, label: 'Equation Info' },
    { key: 'citations' as const, icon: BookOpen, label: 'Citations' },
    { key: 'similar' as const, icon: Star, label: 'Similar' },
    { key: 'analysis' as const, icon: Zap, label: 'Analysis' },
    { key: 'plot' as const, icon: LineChart, label: 'Plot' },
    { key: 'history' as const, icon: History, label: 'History' },
  ];

  const complexityColors = {
    basic: 'text-green-600 bg-green-100',
    intermediate: 'text-yellow-600 bg-yellow-100',
    advanced: 'text-red-600 bg-red-100',
  };

  const plotOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: plotConfig.showLegend,
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Plot of ${currentEquation}`,
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        display: true,
        title: {
          display: true,
          text: 'x',
        },
        grid: {
          display: plotConfig.showGrid,
        },
        min: plotConfig.xMin,
        max: plotConfig.xMax,
      },
      y: {
        type: 'linear' as const,
        display: true,
        title: {
          display: true,
          text: 'f(x)',
        },
        grid: {
          display: plotConfig.showGrid,
        },
        min: plotConfig.yMin,
        max: plotConfig.yMax,
      },
    },
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
     <header className="bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-indigo-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Equation Studio Pro
              </h1>
            </div>
            <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
              AI-Powered
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Gallery Navigation Button */}
            <button
              onClick={() => navigate('/gallery')}
              className="flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
              title="View published equations"
            >
              <Grid className="w-4 h-4 mr-2" />
              Gallery
            </button>

            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value as Field)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-all"
            >
              <option value="mathematics">Mathematics</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="biology">Biology</option>
              <option value="ml">Machine Learning</option>
              <option value="engineering">Engineering</option>
              <option value="economics">Economics</option>
              <option value="statistics">Statistics</option>
              <option value="computer-science">Computer Science</option>
              <option value="quantum">Quantum Physics</option>
              <option value="astronomy">Astronomy</option>
              <option value="finance">Finance</option>
            </select>

            <button
              onClick={clearEquation}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Clear equation"
            >
              <RotateCcw className="w-5 h-5 text-slate-600" />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              title="Log out and switch account"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Log Out
            </button>
          </div>
        </div>
        
        <style>
          {`
            .prose h3 {
              font-weight: bold;
              margin-top: 1rem;
            }
            .prose ol {
              padding-left: 1.5rem;
              margin-top: 0.5rem;
            }
            .prose li {
              margin-bottom: 0.5rem;
            }
          `}
        </style>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`bg-white border-r border-slate-200 transition-all duration-300 ${leftSidebarCollapsed ? 'w-0' : 'w-96'} overflow-hidden flex flex-col`}>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Tools</h2>
                <button
                  onClick={() => setLeftSidebarCollapsed(true)}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
                <button
                  onClick={() => setActiveLeftTab('symbols')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    activeLeftTab === 'symbols'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Symbols
                </button>
                <button
                  onClick={() => setActiveLeftTab('templates')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    activeLeftTab === 'templates'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Templates
                </button>
                <button
                  onClick={() => setActiveLeftTab('shortcuts')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    activeLeftTab === 'shortcuts'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Shortcuts
                </button>
                <button
                  onClick={() => setActiveLeftTab('matrices')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    activeLeftTab === 'matrices'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Matrix className="w-3 h-3 inline mr-1" />
                  Matrices
                </button>
                <button
                  onClick={() => setActiveLeftTab('operations')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    activeLeftTab === 'operations'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="w-3 h-3 inline mr-1" />
                  Operations
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeLeftTab === 'symbols' && (
                <div ref={symbolsContainerRef} className="p-4 space-y-4">
                  {Object.entries(symbolCategories).map(([category, symbols]) => (
                    <div key={category}>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 tracking-wide flex items-center">
                        <ChevronRight className="w-3 h-3 mr-1" />
                        {category}
                      </h3>
                      <div className="grid grid-cols-5 gap-2">
                        {symbols.map((symbol, idx) => (
                          <button
                            key={idx}
                            onClick={() => insertSymbol(symbol)}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all text-center hover:scale-105"
                            title={symbol}
                          >
                            <span className="text-sm">\({symbol}\)</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeLeftTab === 'templates' && (
  <div className="flex flex-col h-full">
    <div className="p-4 border-b border-slate-200 bg-white">
      <h3 className="text-sm font-semibold text-slate-700 capitalize">
        {selectedField.replace('-', ' ')} Templates
      </h3>
      <p className="text-xs text-slate-500 mt-1">
        {Object.keys(equationTemplates[selectedField] || {}).length} templates available
      </p>
    </div>
    <div 
      ref={templatesContainerRef} 
      className="flex-1 overflow-y-auto p-4 space-y-3"
    >
      {Object.entries(equationTemplates[selectedField] || {}).map(([name, latex]) => {
        // Truncate very long LaTeX for better display
        const displayLatex = latex.length > 60 
          ? latex.substring(0, 57) + '...' 
          : latex;
        
        const isLongEquation = latex.length > 60;
        
        return (
          <button
            key={name}
            onClick={() => loadTemplate(name)}
            className={`w-full p-3 text-left border rounded-lg transition-all group ${
              selectedTemplate === name
                ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
            title={isLongEquation ? `Click to load: ${latex}` : name}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm font-medium text-slate-800 flex-1">{name}</div>
              {isLongEquation && (
                <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded ml-2">
                  Long
                </div>
              )}
            </div>
            <div className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded border border-slate-200 overflow-hidden">
              {`\\(${displayLatex}\\)`}
            </div>
            {isLongEquation && (
              <div className="text-xs text-slate-500 mt-2 flex items-center">
                <Lightbulb className="w-3 h-3 mr-1" />
                Click to load full equation
              </div>
            )}
          </button>
        );
      })}
    </div>
  </div>
)}

              {activeLeftTab === 'shortcuts' && (
                <div ref={shortcutsContainerRef} className="p-4">
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search shortcuts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h4 className="text-xs font-semibold text-indigo-900 mb-2 flex items-center">
                      <Lightbulb className="w-3 h-3 mr-1" />
                      How to Use Shortcuts
                    </h4>
                    <ul className="text-xs text-indigo-800 space-y-1">
                      <li>• Type shortcut + SPACE to expand</li>
                      <li>• Example: <code className="bg-white px-1 rounded">x2 </code> → x², <code className="bg-white px-1 rounded">62 </code> → 6²</li>
                      <li>• Ctrl+B → Bold, Ctrl+I → Italic, Ctrl+/ → Fraction, Ctrl+M → Matrix, Ctrl+P → Plot</li>
                      <li>• Use @ for Greek letters: <code className="bg-white px-1 rounded">@a </code> → α, <code className="bg-white px-1 rounded">@G </code> → Γ</li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                      {filteredShortcuts.length} Shortcuts Available
                    </h3>
                    {filteredShortcuts.map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all"
                      >
                        <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                          {key}
                        </code>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                        <div className="text-sm flex-1 text-right">
                          \({value}\)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeLeftTab === 'matrices' && (
  <div className="flex flex-col h-full">
    <div className="p-4 border-b border-slate-200 bg-white">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center">
        <Grid className="w-4 h-4 mr-2" />
        Matrix Templates
      </h3>
      <p className="text-xs text-slate-500 mt-1">
        {Object.keys(matrixTemplates).length} matrix templates
      </p>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {Object.entries(matrixTemplates).map(([name, template]) => {
        // Truncate very long matrix templates
        const displayTemplate = template.length > 80 
          ? template.substring(0, 77) + '...' 
          : template;
        
        const isLongMatrix = template.length > 80;
        
        return (
          <button
            key={name}
            onClick={() => insertMatrixTemplate(template)}
            className="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all group"
            title={isLongMatrix ? `Click to insert: ${template}` : name}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm font-medium text-slate-800 flex-1 flex items-center">
                <Grid className="w-3 h-3 mr-2 flex-shrink-0" />
                {name}
              </div>
              {isLongMatrix && (
                <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded ml-2">
                  Large
                </div>
              )}
            </div>
            <div className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded border border-slate-200 overflow-hidden">
              {`\\(${displayTemplate}\\)`}
            </div>
            {isLongMatrix && (
              <div className="text-xs text-slate-500 mt-2 flex items-center">
                <Lightbulb className="w-3 h-3 mr-1" />
                Click to insert full matrix
              </div>
            )}
          </button>
        );
      })}
    </div>
  </div>
)}

              {activeLeftTab === 'operations' && (
  <div className="flex flex-col h-full">
    <div className="p-4 border-b border-slate-200 bg-white">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center">
        <Sliders className="w-4 h-4 mr-2" />
        Advanced Operations
      </h3>
      <p className="text-xs text-slate-500 mt-1">
        {Object.keys(advancedOperations).length} operations available
      </p>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {Object.entries(advancedOperations).map(([name, operation]) => {
        // Truncate very long operations
        const displayOperation = operation.length > 100 
          ? operation.substring(0, 97) + '...' 
          : operation;
        
        const isLongOperation = operation.length > 100;
        
        return (
          <button
            key={name}
            onClick={() => insertAdvancedOperation(operation)}
            className="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all group"
            title={isLongOperation ? `Click to insert: ${operation}` : name}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm font-medium text-slate-800 flex-1 flex items-center">
                <Sliders className="w-3 h-3 mr-2 flex-shrink-0" />
                {name}
              </div>
              {isLongOperation && (
                <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded ml-2">
                  Complex
                </div>
              )}
            </div>
            <div className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded border border-slate-200 overflow-hidden">
              {`\\(${displayOperation}\\)`}
            </div>
            {isLongOperation && (
              <div className="text-xs text-slate-500 mt-2 flex items-center">
                <Lightbulb className="w-3 h-3 mr-1" />
                Click to insert full operation
              </div>
            )}
          </button>
        );
      })}
    </div>
  </div>
)}
            </div>
          </div>
        </aside>

        {leftSidebarCollapsed && (
          <button
            onClick={() => setLeftSidebarCollapsed(false)}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-r-lg p-2 shadow-lg hover:bg-slate-50 z-10"
          >
            <Menu className="w-4 h-4 text-slate-600" />
          </button>
        )}

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center">
                  <Code className="w-4 h-4 mr-2" />
                  LaTeX Input
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">{latexInput.length} characters</span>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={latexInput}
                onChange={handleLatexChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your equation... (Try: x2 + space, 62 + space, {, Ctrl+B, Ctrl+M, Ctrl+P)"
                className="w-full p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset"
                rows={6}
                style={{ minHeight: '150px', maxHeight: '300px' }}
              />
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Live Preview
                  </h3>
                  <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setActivePreviewTab('equation')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        activePreviewTab === 'equation'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Equation
                    </button>
                    <button
                      onClick={() => setActivePreviewTab('plot')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        activePreviewTab === 'plot'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Plot
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPreviewExpanded(!previewExpanded)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                    title={previewExpanded ? 'Minimize' : 'Maximize'}
                  >
                    {previewExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div
                className="flex-1 flex items-center justify-center p-8 overflow-auto bg-slate-50"
                style={{ minHeight: '400px' }}
              >
                {activePreviewTab === 'equation' ? (
                  <div
                    ref={previewRef}
                    className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 w-full max-w-4xl overflow-x-auto"
                    style={{
                      fontSize: previewExpanded ? '2rem' : '1.5rem',
                    }}
                    dangerouslySetInnerHTML={{ __html: `\\[${currentEquation}\\]` }}
                  />
                ) : (
                  <div ref={plotContainerRef} className="w-full h-full max-w-4xl">
                    {isPlotting ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <span className="ml-2 text-slate-600">Generating plot...</span>
                      </div>
                    ) : plotError ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <LineChart className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm text-center">{plotError}</p>
                        <button
                          onClick={regeneratePlot}
                          className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : plotData ? (
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 h-full">
                        <div className="h-96">
                          <Line data={plotData} options={plotOptions} />
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-xs">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={plotConfig.showGrid}
                                onChange={(e) => setPlotConfig({...plotConfig, showGrid: e.target.checked})}
                                className="rounded"
                              />
                              <span>Show Grid</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={plotConfig.showLegend}
                                onChange={(e) => setPlotConfig({...plotConfig, showLegend: e.target.checked})}
                                className="rounded"
                              />
                              <span>Show Legend</span>
                            </label>
                          </div>
                          <button
                            onClick={regeneratePlot}
                            className="flex items-center px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
                          >
                            <RefreshCcw className="w-3 h-3 mr-1" />
                            Refresh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <LineChart className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm">Enter an equation to generate a plot</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

           <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
  <div className="flex items-center justify-between flex-wrap gap-3">
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-slate-700">Copy:</span>
      {(['latex', 'html', 'plain', 'word'] as ExportFormat[]).map((format) => (
        <button
          key={format}
          onClick={() => copyToClipboard(format)}
          disabled={!currentEquation}
          className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
            copiedFormat === format
              ? 'bg-green-100 text-green-700 border-green-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          } border disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {copiedFormat === format ? (
            <span className="flex items-center">✓ Copied</span>
          ) : (
            <span className="flex items-center">
              <Copy className="w-3 h-3 mr-1" />
              {format.toUpperCase()}
            </span>
          )}
        </button>
      ))}
    </div>
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-slate-700">Export:</span>
      {(['latex', 'html'] as ExportFormat[]).map((format) => (
        <button
          key={format}
          onClick={() => downloadEquation(format)}
          disabled={!currentEquation}
          className="px-3 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-all border border-indigo-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-3 h-3 mr-1" />
          {format.toUpperCase()}
        </button>
      ))}
      
      <button
        onClick={handleShare}
        disabled={!currentEquation}
        className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
          copiedLink
            ? 'bg-green-100 text-green-700 border-green-300'
            : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200'
        } border flex items-center disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {copiedLink ? (
          <span className="flex items-center">✓ Link Copied</span>
        ) : (
          <span className="flex items-center">
            <Share2 className="w-3 h-3 mr-1" />
            Share
          </span>
        )}
      </button>
      <button
        onClick={() => setShowPublishModal(true)}
        disabled={!currentEquation}
        className="px-3 py-1.5 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all border border-transparent flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <Upload className="w-3 h-3 mr-1" />
        Publish
      </button>
    </div>
  </div>
</div>
          </div>
        </main>

        <aside className={`bg-white border-l border-slate-200 transition-all duration-300 ${rightSidebarCollapsed ? 'w-0' : 'w-96'} overflow-hidden flex flex-col`}>
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center">
                <Zap className="w-4 h-4 mr-2 text-indigo-600" />
                AI Insights
              </h2>
              <button
                onClick={() => setRightSidebarCollapsed(true)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
              {aiTabs.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveAITab(key)}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    activeAITab === key
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div ref={aiContentRef} className="flex-1 overflow-y-auto p-4">
            {activeAITab === 'info' && (
              <div>
                {currentEquationInfo ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-indigo-900 flex items-center">
                          <Sparkles className="w-4 h-4 mr-2" />
                          {currentEquationInfo.name}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${complexityColors[currentEquationInfo.complexity]}`}>
                          {currentEquationInfo.complexity}
                        </span>
                      </div>
                      <div className="text-xs text-indigo-700 mb-2 uppercase tracking-wide">
                        {currentEquationInfo.field}
                      </div>
                      <p className="text-sm text-indigo-800">{currentEquationInfo.description}</p>
                      <div className="mt-2">
                        <span className="text-xs text-indigo-600 font-medium">Variables: </span>
                        <span className="text-xs text-indigo-700">{currentEquationInfo.variables.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Enter an equation to see AI-powered insights</p>
                  </div>
                )}
              </div>
            )}

          {activeAITab === 'citations' && (
  <div>
    {loadingCitation ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    ) : citations.length > 0 ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Academic Citations</h3>
          <select
            value={citationFormat}
            onChange={(e) => setCitationFormat(e.target.value as CitationFormat)}
            className="text-xs border border-slate-300 rounded px-2 py-1"
          >
            <option value="apa">APA</option>
            <option value="ieee">IEEE</option>
            <option value="harvard">Harvard</option>
            <option value="mla">MLA</option>
            <option value="chicago">Chicago</option>
          </select>
        </div>
        {citations.map((citation, idx) => {
          // Extract author names (text before year or first parenthesis/bracket)
          const authorMatch = citation.match(/^([^(\[0-9]+)/);
          const authors = authorMatch ? authorMatch[1].trim() : '';
          const restOfCitation = authors ? citation.substring(authors.length).trim() : citation;
          
          return (
            <div
              key={idx}
              className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-xs font-semibold text-indigo-600">
                      [{idx + 1}]
                    </div>
                    {authors && (
                      <div className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {authors}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {restOfCitation || citation}
                  </p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(citation)}
                  className="ml-2 p-1.5 hover:bg-white rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy citation"
                >
                  <Copy className="w-3 h-3 text-slate-400 hover:text-indigo-600" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="text-center py-8 text-slate-400">
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Citations will appear here</p>
      </div>
    )}
  </div>
)}

            {activeAITab === 'similar' && (
  <div>
    {loadingSimilar ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    ) : similarEquations.length > 0 ? (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Similar Equations</h3>
        {similarEquations.map((eq, idx) => (
          <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-indigo-800">{eq.name}</h4>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">{Math.round(eq.similarity * 100)}% match</span>
                <button
                  onClick={() => useSimilarEquation(eq.latex)}
                  className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition"
                >
                  Use
                </button>
              </div>
            </div>
            <div className="text-xs text-slate-600 uppercase mb-1">{eq.field}</div>
            {/* Fixed equation display with proper overflow handling */}
            <div className="mb-2 overflow-x-auto">
              <div 
                className="text-sm min-w-min"
                style={{ fontSize: '0.9rem' }}
                dangerouslySetInnerHTML={{ __html: `\\(${eq.latex}\\)` }}
              />
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{eq.description}</p>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-8 text-slate-400">
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Similar equations will appear here</p>
      </div>
    )}
  </div>
)}

          {activeAITab === 'analysis' && (
  <div>
    {loadingAnalysis ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    ) : equationAnalysis ? (
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Mathematical Analysis</h3>
        <div className="space-y-4">
          {equationAnalysis.split('\n\n').map((section, idx) => {
            const lines = section.split('\n');
            const heading = lines[0];
            const content = lines.slice(1);
            
            return (
              <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-indigo-900 mb-2">
                  {heading}
                </h4>
                <div className="space-y-1">
                  {content.map((line, lineIdx) => (
                    line.trim() && (
                      <p key={lineIdx} className="text-sm text-slate-700 leading-relaxed">
                        {line.trim()}
                      </p>
                    )
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      <div className="text-center py-8 text-slate-400">
        <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Mathematical analysis will appear here</p>
      </div>
    )}
  </div>
)}

            {activeAITab === 'plot' && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Plot Configuration</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1 block">X Min</label>
                      <input
                        type="number"
                        value={plotConfig.xMin}
                        onChange={(e) => setPlotConfig({...plotConfig, xMin: parseFloat(e.target.value)})}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1 block">X Max</label>
                      <input
                        type="number"
                        value={plotConfig.xMax}
                        onChange={(e) => setPlotConfig({...plotConfig, xMax: parseFloat(e.target.value)})}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1 block">Y Min</label>
                      <input
                        type="number"
                        value={plotConfig.yMin}
                        onChange={(e) => setPlotConfig({...plotConfig, yMin: parseFloat(e.target.value)})}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1 block">Y Max</label>
                      <input
                        type="number"
                        value={plotConfig.yMax}
                        onChange={(e) => setPlotConfig({...plotConfig, yMax: parseFloat(e.target.value)})}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Step Size</label>
                    <input
                      type="number"
                      step="0.01"
                      value={plotConfig.step}
                      onChange={(e) => setPlotConfig({...plotConfig, step: parseFloat(e.target.value)})}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                  </div>
                  <button
                    onClick={regeneratePlot}
                    disabled={isPlotting}
                    className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isPlotting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {isPlotting ? 'Generating...' : 'Update Plot'}
                  </button>
                </div>
              </div>
            )}

{activeAITab === 'history' && (
  <div>
    {equationHistory.length > 0 ? (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Equations</h3>
        {equationHistory.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              setLatexInput(item.equation);
              setCurrentEquation(item.equation);
            }}
            className="w-full p-3 text-left bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
          >
            <div className="text-xs text-slate-500 mb-2">
              {item.timestamp instanceof Date 
                ? `${item.timestamp.toLocaleDateString('en-GB', { 
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })} • ${item.timestamp.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                  })}`
                : item.timestamp?.toDate 
                  ? `${item.timestamp.toDate().toLocaleDateString('en-GB', { 
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })} • ${item.timestamp.toDate().toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: false
                    })}`
                  : 'Unknown date'
              }
            </div>
            <div 
              className="text-sm text-slate-700 mb-1 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: `\\(${item.equation}\\)` }}
            />
            <div className="text-xs text-slate-500">
              {item.citations.length} citations
            </div>
          </button>
        ))}
      </div>
    ) : (
      <div className="text-center py-8 text-slate-400">
        <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Your equation history will appear here</p>
      </div>
    )}
  </div>
)}
          </div>
        </aside>

       {rightSidebarCollapsed && (
          <button
            onClick={() => setRightSidebarCollapsed(false)}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-l-lg p-2 shadow-lg hover:bg-slate-50 z-10"
          >
            <Zap className="w-4 h-4 text-indigo-600" />
          </button>
        )}
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-indigo-600" />
                Publish Equation
              </h3>
              <button
                onClick={() => {
                  setShowPublishModal(false);
                  setPublishError(null);
                }}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Preview */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-medium text-slate-600 mb-2">Preview:</p>
                <div 
                  className="text-center text-lg"
                  dangerouslySetInnerHTML={{ __html: `\\[${currentEquation}\\]` }}
                />
              </div>

              {/* Equation Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Equation Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={equationName}
                  onChange={(e) => setEquationName(e.target.value)}
                  placeholder="e.g., Quadratic Formula"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  maxLength={100}
                />
                <p className="text-xs text-slate-500 mt-1">{equationName.length}/100 characters</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={equationDescription}
                  onChange={(e) => setEquationDescription(e.target.value)}
                  placeholder="Describe what this equation represents or how it's used..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-slate-500 mt-1">{equationDescription.length}/500 characters</p>
              </div>

              {/* Field Display */}
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <span className="text-sm text-indigo-700 font-medium">Field:</span>
                <span className="text-sm text-indigo-900 font-semibold capitalize">
                  {selectedField.replace('-', ' ')}
                </span>
              </div>

              {/* Error Message */}
              {publishError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{publishError}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPublishModal(false);
                  setPublishError(null);
                  setEquationName('');
                  setEquationDescription('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing || !equationName.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalEquationBuilder;