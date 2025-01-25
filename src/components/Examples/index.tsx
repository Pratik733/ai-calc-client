import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';

interface Example {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
}

const EXAMPLE_PROBLEMS: Example[] = [
    {
        id: 1,
        title: "Basic Arithmetic",
        description: "Solve simple arithmetic problems like 2 + 3 = ?",
        imageUrl: "/src/assets/Examples/arithmetic.png"
    },
    {
        id: 2,
        title: "Algebraic Equations",
        description: "Solve equations like 2x + 3 = 7",
        imageUrl: "/src/assets/Examples/algebraic.png"
    },
    {
        id: 3,
        title: "Geometric Problems",
        description: "Calculate area, perimeter of shapes",
        imageUrl: "/src/assets/Examples/geometric.png"
    },
    {
        id: 4,
        title: "Calculus Problems",
        description: "Solve derivatives and integrals",
        imageUrl: "/src/assets/Examples/calculus.png"
    }
];

export function Examples() {
    return (
        <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Example Problems</h2>
            <Carousel
                withIndicators
                height={325}
                slideSize="100%"
                slideGap="md"
                loop
                align="start"
                classNames={{
                    root: 'w-full',
                    indicators: 'gap-1',
                    indicator: 'bg-gray-600 hover:bg-gray-500',
                }}
            >
                {EXAMPLE_PROBLEMS.map((example) => (
                    <Carousel.Slide key={example.id}>
                        <div className="flex flex-col items-center p-4">
                            <img
                                src={example.imageUrl}
                                alt={example.title}
                                className="rounded-lg mb-4 w-full object-cover"
                            />
                            <h3 className="text-lg font-medium text-white mb-2">
                                {example.title}
                            </h3>
                            <p className="text-gray-400 text-center">
                                {example.description}
                            </p>
                        </div>
                    </Carousel.Slide>
                ))}
            </Carousel>
        </div>
    );
} 