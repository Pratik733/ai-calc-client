import { ColorSwatch, SegmentedControl } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import Draggable from 'react-draggable';
import { SWATCHES } from '@/constants';
import toast from 'react-hot-toast';
import { Examples } from '@/components/Examples';
// import {LazyBrush} from 'lazy-brush';

interface GeneratedResult {
    expression: string;
    answer: string;
}

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

interface DictOfVars {
    [key: string]: string | number;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [reset, setReset] = useState(false);
    const [dictOfVars, setDictOfVars] = useState<DictOfVars>({});
    const [result, setResult] = useState<GeneratedResult>();
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
    const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
    const [eraserSize, setEraserSize] = useState(20);
    const [latexPositions, setLatexPositions] = useState<Array<{ x: number; y: number }>>([]);
    const [undoStack, setUndoStack] = useState<ImageData[]>([]);
    const [redoStack, setRedoStack] = useState<ImageData[]>([]);

    // const lazyBrush = new LazyBrush({
    //     radius: 10,
    //     enabled: true,
    //     initialPoint: { x: 0, y: 0 },
    // });

    const renderLatexToCanvas = useCallback((expression: string, answer: string, index: number) => {
        const formattedExpression = expression.replace(/ /g, '\\ ');
        const latex = formattedExpression.includes(`=${answer}`)
            ? `\\(\\LARGE{${formattedExpression}}\\)`
            : `\\(\\LARGE{${formattedExpression} = ${answer}}\\)`;

        setLatexExpression(prev => [...prev, latex]);

        // Calculate vertical offset for each expression
        const verticalOffset = index * 40; // 40 pixels between each expression
        setLatexPositions(prev => [...prev, {
            x: latexPosition.x,
            y: latexPosition.y + verticalOffset
        }]);
    }, [latexPosition]);

    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer, 0);
        }
    }, [result, renderLatexToCanvas]);

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setLatexPositions([]);
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                canvas.style.background = 'black';
                ctx.lineCap = 'round';
                ctx.lineWidth = 3;
                
                // Initialize with empty stacks instead of saving initial state
                setUndoStack([]);
                setRedoStack([]);
            }
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
            });
        };

        return () => {
            document.head.removeChild(script);
        };

    }, []);

    const saveCanvasState = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            setUndoStack(prev => [...prev, currentState]);
            setRedoStack([]); // Clear redo stack when new action is performed
        }
    }, []);

    const handleUndo = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas && undoStack.length > 0) {
            const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const previousState = undoStack[undoStack.length - 1];
            
            // Save current state to redo stack
            setRedoStack(prev => [...prev, currentState]);
            
            // Restore previous state
            ctx.putImageData(previousState, 0, 0);
            
            // Remove the used state from undo stack
            setUndoStack(prev => prev.slice(0, -1));
        }
    }, [undoStack]);

    const handleRedo = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas && redoStack.length > 0) {
            const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const nextState = redoStack[redoStack.length - 1];
            
            // Save current state to undo stack
            setUndoStack(prev => [...prev, currentState]);
            
            // Restore next state
            ctx.putImageData(nextState, 0, 0);
            
            // Remove the used state from redo stack
            setRedoStack(prev => prev.slice(0, -1));
        }
    }, [redoStack]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            } else if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                handleRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Clear both stacks
                setUndoStack([]);
                setRedoStack([]);
            }
        }
    };

    const startDrawing = (e: MouseEvent) => {
        setIsDrawing(true);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            // Save state before starting new drawing action
            if (!isDrawing) {
                saveCanvasState();
            }
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
        }
    };
    const draw = (e: MouseEvent) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (ctx && isDrawing) {
            if (tool === 'pen') {
                ctx.lineWidth = 5;
                ctx.strokeStyle = color;
                ctx.globalCompositeOperation = 'source-over';
            } else {
                ctx.lineWidth = eraserSize;
                ctx.strokeStyle = '#ffffff';
                ctx.globalCompositeOperation = 'destination-out';
            }
            ctx.lineCap = 'round';
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
        }
    };
    const stopDrawing = () => {
        // Remove saveCanvasState from here since we're saving at the start
        setIsDrawing(false);
    };

    const updateCursor = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas && tool === 'eraser') {
            const cursor = `
                <svg width="${eraserSize}" height="${eraserSize}" viewBox="0 0 ${eraserSize} ${eraserSize}" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="${eraserSize / 2}" cy="${eraserSize / 2}" r="${eraserSize / 2 - 1}" fill="rgba(255,255,255,0.5)" stroke="black"/>
                </svg>`;
            const cursorUrl = `data:image/svg+xml;base64,${btoa(cursor)}`;
            canvas.style.cursor = `url('${cursorUrl}') ${eraserSize / 2} ${eraserSize / 2}, auto`;
        } else if (canvas) {
            canvas.style.cursor = 'crosshair';
        }
    }, [tool, eraserSize]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener('mousemove', updateCursor);
            return () => {
                canvas.removeEventListener('mousemove', updateCursor);
            };
        }
    }, [tool, eraserSize, updateCursor]);

    const runRoute = async () => {
        const canvas = canvasRef.current;

        if (canvas) {
            const loadingToast = toast.loading('Processing your calculation...');
            try {
                const response = await axios({
                    method: 'post',
                    url: `${import.meta.env.VITE_API_URL}/calculate`,
                    data: {
                        image: canvas.toDataURL('image/png'),
                        dict_of_vars: dictOfVars
                    }
                });

                const resp = await response.data;
                console.log('API Response:', resp);

                if (!resp || Object.keys(resp).length === 0) {
                    console.error('Empty response received');
                    toast.error('No results found. Please try again.', {
                        id: loadingToast,
                    });
                    return;
                }

                if (!resp.data || resp.data.length === 0) {
                    toast.error('Unable to process input. Please try again.', {
                        id: loadingToast,
                    });
                    return;
                }

                toast.success('Calculation completed!', {
                    id: loadingToast,
                });

                // Update dictOfVars with all assignments
                const newVars = { ...dictOfVars };
                resp.data.forEach((data: Response) => {
                    if (data.assign) {
                        newVars[data.expr] = data.result;
                    }
                });
                setDictOfVars(newVars);

                // Calculate center position
                const ctx = canvas.getContext('2d');
                const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
                let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const i = (y * canvas.width + x) * 4;
                        if (imageData.data[i + 3] > 0) {
                            minX = Math.min(minX, x);
                            minY = Math.min(minY, y);
                            maxX = Math.max(maxX, x);
                            maxY = Math.max(maxY, y);
                        }
                    }
                }

                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                setLatexPosition({ x: centerX, y: centerY });

                // Render all expressions
                resp.data.forEach((data: Response, index: number) => {
                    renderLatexToCanvas(data.expr, data.result.toString(), index);
                });

            } catch (error) {
                toast.error('Failed to process calculation', {
                    id: loadingToast,
                });
                console.error('Error:', error);
            }
        }
    };

    return (
        <div className="container mx-auto p-4">
            {/* Toolbar */}
            <div className="toolbar fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center justify-center gap-4 bg-gray-800 text-white rounded-md shadow-md p-2 max-w-screen-lg">
                {/* Reset Button */}
                <Button
                    onClick={() => setReset(true)}
                    className="bg-red-600 hover:bg-red-500 text-white font-medium px-3 py-1 text-sm rounded"
                    variant="default"
                >
                    Reset
                </Button>

                {/* Undo/Redo Buttons */}
                <div className="flex gap-2">
                    <Button
                        onClick={handleUndo}
                        disabled={undoStack.length === 0}
                        title="Undo (Ctrl+Z)"
                        className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-3 py-1 text-sm rounded disabled:opacity-50"
                        variant="default"
                    >
                        ↩ Undo
                    </Button>
                    <Button
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        title="Redo (Ctrl+Y)"
                        className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-3 py-1 text-sm rounded disabled:opacity-50"
                        variant="default"
                    >
                        ↪ Redo
                    </Button>
                </div>

                {/* Tool Selector */}
                <div className="flex items-center gap-2">
                    <SegmentedControl
                        value={tool}
                        onChange={(value: string) => setTool(value as 'pen' | 'eraser')}
                        data={[
                            { label: '✏️ Pen', value: 'pen' },
                            { label: '🩹 Eraser', value: 'eraser' },
                        ]}
                        className="w-40"
                    />

                    {/* Slider (visible when eraser is active) */}
                    {tool === 'eraser' && (
                        <div className="flex items-center gap-2">
                            <label htmlFor="eraser-size" className="text-xs">
                                Size:
                            </label>
                            <input
                                id="eraser-size"
                                type="range"
                                min="10"
                                max="50"
                                value={eraserSize}
                                onChange={(e) => setEraserSize(parseInt(e.target.value))}
                                className="w-20"
                            />
                        </div>
                    )}
                </div>

                {/* Color Swatches */}
                <div className="flex items-center gap-2">
                    {SWATCHES.map((swatch) => (
                        <ColorSwatch
                            key={swatch}
                            color={swatch}
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                            }}
                            onClick={() => {
                                setColor(swatch);
                                setTool('pen');
                            }}
                        />
                    ))}
                </div>

                {/* Run Button */}
                <Button
                    onClick={runRoute}
                    className="bg-green-600 hover:bg-green-500 text-white font-medium px-3 py-1 text-sm rounded"
                    variant="default"
                >
                    Run
                </Button>
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                id="canvas"
                className="absolute top-0 left-0 w-full h-full"
                onMouseDown={(e) => startDrawing(e.nativeEvent)}
                onMouseMove={(e) => draw(e.nativeEvent)}
                onMouseUp={() => stopDrawing()}
                onMouseOut={() => stopDrawing()}
            />


            {/* Dynamic LaTeX Expressions */}
            {latexExpression.map((latex, index) => (
                <Draggable
                    key={index}
                    defaultPosition={latexPositions[index] || latexPosition}
                    onStop={(_, data) => {
                        const newPositions = [...latexPositions];
                        newPositions[index] = { x: data.x, y: data.y };
                        setLatexPositions(newPositions);
                    }}
                >
                    <div className="absolute p-2 text-white rounded shadow-md">
                        <div className="latex-content">{latex}</div>
                    </div>
                </Draggable>
            ))}
            <div className="w-80 example-carousel">
                <Examples />
            </div>
        </div>
    );
}
