 'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { FLOAT_BTN_SIZE, loadFloatingPosition, saveFloatingPosition, saveFloatingPositionServer, loadFloatingPositionServer } from './floatingPosition';
import { Calculator, X, Minus, Maximize2, Delete } from 'lucide-react';

export default function DraggableCalculator() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [display, setDisplay] = useState('');
  const [result, setResult] = useState('');
  const [bottomOffset, setBottomOffset] = useState(16);
  const [rightOffset, setRightOffset] = useState(16);

  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const calculatorRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(0);

  // Abrir automaticamente em telas maiores (desktop)
  useEffect(() => {
    const handleResize = () => {
      try {
        if (window.innerWidth >= 1024) {
          setIsOpen(true);
        }
      } catch {
        // noop em ambientes sem window
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Carregar posição salva (server-first, depois local)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (profile?.id) {
          const srv = await loadFloatingPositionServer(profile.id, 'floating:calculator');
          if (srv && srv.x !== undefined && srv.y !== undefined) {
            if (mounted) setPosition(srv);
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      try {
        const raw = loadFloatingPosition('floating:calculator');
        if (raw) {
          const p = raw;
          if (p?.x !== undefined && p?.y !== undefined && mounted) setPosition(p);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  // Ajusta offset inferior para evitar sobreposição com barras fixas em mobile
  useEffect(() => {
    const updateOffset = () => {
      try {
        const isMobile = window.innerWidth <= 767;
        // alinhar com o botão de perda (que usa bottom-20 => 80px)
        setBottomOffset(isMobile ? 80 : 16);
        // empurra a calculadora para a esquerda no mobile para formar duo de botões
        setRightOffset(isMobile ? 72 : 16);
      } catch {
        // noop
      }
    };
    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
    draggingRef.current = true;
    const rect = calculatorRef.current?.getBoundingClientRect();
    if (rect) {
      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    movedRef.current = 0;
    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const x = ev.clientX - offsetRef.current.x;
      const y = ev.clientY - offsetRef.current.y;
      const clampedX = Math.max(8, Math.min(x, window.innerWidth - FLOAT_BTN_SIZE - 8));
      const clampedY = Math.max(8, Math.min(y, window.innerHeight - FLOAT_BTN_SIZE - 8));
      setPosition({ x: clampedX, y: clampedY });
      movedRef.current += Math.hypot(ev.movementX || 0, ev.movementY || 0);
    };
    const onUp = () => {
      draggingRef.current = false;
      try {
        saveFloatingPosition('floating:calculator', position);
        void saveFloatingPositionServer(profile?.id, 'floating:calculator', position);
      } catch (e) {}
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMinimized) return;
    const t = e.touches[0];
    draggingRef.current = true;
    const rect = calculatorRef.current?.getBoundingClientRect();
    if (rect) {
      offsetRef.current = {
        x: t.clientX - rect.left,
        y: t.clientY - rect.top,
      };
    }
    movedRef.current = 0;
    const onMove = (ev: TouchEvent) => {
      if (!draggingRef.current) return;
      const touch = ev.touches[0];
      const x = touch.clientX - offsetRef.current.x;
      const y = touch.clientY - offsetRef.current.y;
      const clampedX = Math.max(8, Math.min(x, window.innerWidth - FLOAT_BTN_SIZE - 8));
      const clampedY = Math.max(8, Math.min(y, window.innerHeight - FLOAT_BTN_SIZE - 8));
      setPosition({ x: clampedX, y: clampedY });
    };
    const onEnd = () => {
      draggingRef.current = false;
      try {
        saveFloatingPosition('floating:calculator', position);
        void saveFloatingPositionServer(profile?.id, 'floating:calculator', position);
      } catch (e) {}
      document.removeEventListener('touchmove', onMove as any);
      document.removeEventListener('touchend', onEnd as any);
    };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd as any);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingRef.current) {
        setPosition({
          x: e.clientX - offsetRef.current.x,
          y: e.clientY - offsetRef.current.y,
        });
      }
    };

    const handleMouseUp = () => {
      draggingRef.current = false;
      try {
        const rect = calculatorRef.current?.getBoundingClientRect();
        if (rect) {
          const p = { x: rect.left, y: rect.top };
          saveFloatingPosition('floating:calculator', p);
          void saveFloatingPositionServer(profile?.id, 'floating:calculator', p);
        }
      } catch (e) {
        // ignore
      }
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen]);

  const handlePress = (val: string) => {
    if (val === 'C') {
      setDisplay('');
      setResult('');
    } else if (val === '=') {
      try {
        const safeExpression = display.replace(/x/g, '*').replace(/÷/g, '/');

        const calc = eval(safeExpression);
        setResult(String(calc));
        setDisplay(String(calc));
      } catch {
        setResult('Erro');
      }
    } else if (val === 'back') {
      setDisplay((prev) => prev.slice(0, -1));
    } else {
      const lastChar = display.slice(-1);
      const isOperator = ['+', '-', 'x', '÷', '.', '%'].includes(val);
      const lastIsOperator = ['+', '-', 'x', '÷', '.', '%'].includes(lastChar);

      if (isOperator && lastIsOperator) {
        setDisplay((prev) => prev.slice(0, -1) + val);
      } else {
        setDisplay((prev) => prev + val);
      }
    }
  };

  if (!isOpen) {
    return (
      <button
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={() => setIsOpen(true)}
        className="fixed bg-slate-800 text-white p-3 rounded-full shadow-lg hover:bg-slate-700 hover:scale-110 transition-all z-50 flex items-center gap-2 group"
        title="Abrir Calculadora"
        style={position ? { left: position.x, top: position.y } : { bottom: bottomOffset, right: rightOffset }}
      >
        <Calculator size={24} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-bold">
          Calculadora
        </span>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div
        style={{ left: position.x, top: position.y }}
        className="fixed z-50 cursor-grab active:cursor-grabbing"
      >
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-xl border-2 border-white animate-bounce-slow"
        >
          <Maximize2 size={24} />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={calculatorRef}
      onMouseDown={(e) => {
        // ignore drags when clicking control buttons or inputs
        const tgt = e.target as HTMLElement;
        if (tgt.closest('button, input, a, textarea, select')) return;
        handleMouseDown(e);
      }}
      onTouchStart={(e) => {
        const tgt = (e.target as HTMLElement);
        if (tgt.closest('button, input, a, textarea, select')) return;
        handleTouchStart(e);
      }}
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 w-72 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200 cursor-move"
    >
      <div className="bg-slate-800 p-3 flex justify-between items-center select-none">
        <div className="flex items-center gap-2 text-slate-300">
          <Calculator size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Calculadora</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-700"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="bg-slate-950 p-4 text-right">
        <div className="text-slate-400 text-sm h-5 overflow-hidden font-mono">{display || '0'}</div>
        <div className="text-white text-3xl font-bold truncate font-mono">
          {result || (display ? '' : '0')}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px bg-slate-700 border-t border-slate-700">
        <CalcButton
          onClick={() => handlePress('C')}
          className="text-red-400 font-bold bg-slate-800"
        >
          C
        </CalcButton>
        <CalcButton onClick={() => handlePress('÷')} className="text-blue-400 bg-slate-800">
          ÷
        </CalcButton>
        <CalcButton onClick={() => handlePress('x')} className="text-blue-400 bg-slate-800">
          x
        </CalcButton>
        <CalcButton
          onClick={() => handlePress('back')}
          className="text-orange-400 bg-slate-800 flex justify-center items-center"
        >
          <Delete size={18} />
        </CalcButton>

        <CalcButton onClick={() => handlePress('7')}>7</CalcButton>
        <CalcButton onClick={() => handlePress('8')}>8</CalcButton>
        <CalcButton onClick={() => handlePress('9')}>9</CalcButton>
        <CalcButton onClick={() => handlePress('-')} className="text-blue-400 bg-slate-800">
          -
        </CalcButton>

        <CalcButton onClick={() => handlePress('4')}>4</CalcButton>
        <CalcButton onClick={() => handlePress('5')}>5</CalcButton>
        <CalcButton onClick={() => handlePress('6')}>6</CalcButton>
        <CalcButton onClick={() => handlePress('+')} className="text-blue-400 bg-slate-800">
          +
        </CalcButton>

        <CalcButton onClick={() => handlePress('1')}>1</CalcButton>
        <CalcButton onClick={() => handlePress('2')}>2</CalcButton>
        <CalcButton onClick={() => handlePress('3')}>3</CalcButton>
        <CalcButton onClick={() => handlePress('%')} className="text-blue-400 bg-slate-800">
          %
        </CalcButton>

        <CalcButton onClick={() => handlePress('0')} className="col-span-2">
          0
        </CalcButton>
        <CalcButton onClick={() => handlePress('.')}>.</CalcButton>
        <CalcButton
          onClick={() => handlePress('=')}
          className="bg-blue-600 text-white hover:bg-blue-500"
        >
          =
        </CalcButton>
      </div>
    </div>
  );
}

function CalcButton({ children, onClick, className = '' }: any) {
  return (
    <button
      onClick={onClick}
      className={`h-14 text-xl font-medium text-slate-200 bg-slate-800/50 hover:bg-slate-700 active:bg-slate-600 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
