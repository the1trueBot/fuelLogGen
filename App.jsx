import React, { useState, useEffect } from 'react';

// Main App component
const App = () => {
    // State variables for user inputs
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [maxTankCapacity, setMaxTankCapacity] = useState(26); // Default to 26 gallons
    const [totalGallonsToPurchase, setTotalGallonsToPurchase] = useState(2450); // Default to 2450 gallons
    const [gasStationsInput, setGasStationsInput] = useState(
        `Circle K, 35 S Grand Blvd, St Louis, Missouri, 63103
BP, 1815 Arsenal, St Louis, Missouri, 63118
Moto, 3120 Mississippi Ave, Sauget, Illinois, 6220
Love's, 6124 N Broadway, St Louis, Missouri, 63147
Circle K, 1514 Hampton Ave, St Louis, Missouri, 63139
Zoom, 1300 N Tucker Blvd, St. Louis, Missouri, 63106
ZX, 1007 S Broadway, St Louis, Missouri, 63103
Shell, 721 N Tucker Blvd, St Louis, Missouri, 63101
QuikTrip, 2600 Chouteau Ave, St Louis, Missouri, 63103
Phillips 66, 1655 S Jefferson Ave, St Louis, Missouri, 63104`
    );

    // State for generated log and error messages
    const [purchaseLog, setPurchaseLog] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [totalGallonsInLog, setTotalGallonsInLog] = useState(0);

    // Effect to set default dates to the specified range (July 1, 2024 - June 30, 2025)
    useEffect(() => {
        setStartDate('2024-07-01');
        setEndDate('2025-06-30');
    }, []);

    // Function to generate the fuel log
    const generateLog = () => {
        setErrorMessage(''); // Clear previous errors
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
        const gasStations = gasStationsInput.split('\n').map(s => s.trim()).filter(s => s.length > 0);

        // --- Input Validation ---
        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            setErrorMessage('Please enter valid start and end dates.');
            return;
        }
        if (parsedStartDate >= parsedEndDate) {
            setErrorMessage('End Date must be after Start Date.');
            return;
        }
        if (maxTankCapacity <= 0) {
            setErrorMessage('Max Tank Capacity must be a positive number.');
            return;
        }
        if (totalGallonsToPurchase <= 0) {
            setErrorMessage('Total Gallons to Purchase must be a positive number.');
            return;
        }
        if (gasStations.length === 0) {
            setErrorMessage('Please enter at least one gas station.');
            return;
        }
        if (totalGallonsToPurchase < maxTankCapacity) {
            setErrorMessage('Total gallons to purchase should generally be greater than or equal to max tank capacity.');
            return;
        }

        // --- Log Generation Logic ---
        const log = [];
        let currentTotalGallons = 0;
        const minFillAmount = 5; // Minimum realistic fill amount

        // Calculate the number of days in the range
        const diffTime = Math.abs(parsedEndDate.getTime() - parsedStartDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Estimate a reasonable number of purchases to distribute the total gallons
        // This helps in spreading out the purchases more realistically
        const estimatedAvgFill = (minFillAmount + maxTankCapacity) / 2;
        let numPurchases = Math.ceil(totalGallonsToPurchase / estimatedAvgFill);

        // Ensure we don't try to make more purchases than there are days, or too few
        numPurchases = Math.max(Math.min(numPurchases, diffDays), Math.ceil(totalGallonsToPurchase / maxTankCapacity));
        numPurchases = Math.max(numPurchases, 1); // Ensure at least one purchase if totalGallonsToPurchase > 0

        // Generate potential dates
        const allPossibleDates = [];
        for (let i = 0; i <= diffDays; i++) {
            const date = new Date(parsedStartDate);
            date.setDate(parsedStartDate.getDate() + i);
            allPossibleDates.push(date);
        }

        // Randomly select distinct dates for the purchases
        let selectedDates = [];
        if (numPurchases <= allPossibleDates.length) {
            selectedDates = randomSample(allPossibleDates, numPurchases).sort((a, b) => a.getTime() - b.getTime());
        } else {
            // If more purchases than days, just assign multiple purchases to some days
            // This scenario is less realistic for distinct dates, but handles the request.
            selectedDates = Array(numPurchases).fill(0).map(() => {
                const randomDay = Math.floor(Math.random() * diffDays);
                const date = new Date(parsedStartDate);
                date.setDate(parsedStartDate.getDate() + randomDay);
                return date;
            }).sort((a, b) => a.getTime() - b.getTime());
        }

        // Generate random fill amounts
        let generatedGallons = Array(numPurchases).fill(0).map(() =>
            random.uniform(minFillAmount, maxTankCapacity)
        );

        // Scale generated gallons to match the total, and adjust for min/max capacity
        const currentSum = generatedGallons.reduce((sum, val) => sum + val, 0);
        const scaleFactor = totalGallonsToPurchase / currentSum;

        generatedGallons = generatedGallons.map(g => {
            let scaledG = g * scaleFactor;
            return Math.max(minFillAmount, Math.min(maxTankCapacity, scaledG));
        });

        // Final fine-tuning to hit the target total exactly due to floating point and capping
        let finalSum = generatedGallons.reduce((sum, val) => sum + val, 0);
        let diff = totalGallonsToPurchase - finalSum;
        let iterationCount = 0;
        const maxIterations = 100; // Prevent infinite loop for tiny differences

        while (Math.abs(diff) > 0.1 && iterationCount < maxIterations) { // Adjust if difference is > 0.1 gallons
            const adjustmentPerItem = diff / numPurchases;
            generatedGallons = generatedGallons.map(g => {
                let adjustedG = g + adjustmentPerItem;
                return Math.max(minFillAmount, Math.min(maxTankCapacity, adjustedG));
            });
            finalSum = generatedGallons.reduce((sum, val) => sum + val, 0);
            diff = totalGallonsToPurchase - finalSum;
            iterationCount++;
        }

        // Populate the log
        for (let i = 0; i < numPurchases; i++) {
            const purchaseDate = selectedDates[i];
            const gallons = parseFloat(generatedGallons[i].toFixed(1)); // Round to 1 decimal place
            const station = random.choice(gasStations);

            log.push({
                date: purchaseDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
                gallons: gallons,
                station: station
            });
            currentTotalGallons += gallons;
        }

        // Sort the log by date
        log.sort((a, b) => new Date(a.date) - new Date(b.date));

        setPurchaseLog(log);
        setTotalGallonsInLog(log.reduce((sum, item) => sum + item.gallons, 0));
    };

    // Helper for random sampling without replacement
    const randomSample = (array, size) => {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, size);
    };

    // Simple random number generator (Python's random.uniform equivalent)
    const random = {
        uniform: (min, max) => Math.random() * (max - min) + min,
        choice: (array) => array[Math.floor(Math.random() * array.length)]
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                <h1 className="text-3xl sm:text-4xl font-bold text-center text-blue-700 mb-8">
                    Dynamic Fuel Log Generator
                </h1>

                {/* Input Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label htmlFor="startDate" className="block text-gray-700 text-sm font-bold mb-2">
                            Start Date:
                        </label>
                        <input
                            type="date"
                            id="startDate"
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-gray-700 text-sm font-bold mb-2">
                            End Date:
                        </label>
                        <input
                            type="date"
                            id="endDate"
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="maxCapacity" className="block text-gray-700 text-sm font-bold mb-2">
                            Max Tank Capacity (Gallons):
                        </label>
                        <input
                            type="number"
                            id="maxCapacity"
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                            value={maxTankCapacity}
                            onChange={(e) => setMaxTankCapacity(parseFloat(e.target.value))}
                            min="1"
                        />
                    </div>
                    <div>
                        <label htmlFor="totalGallons" className="block text-gray-700 text-sm font-bold mb-2">
                            Total Gallons to Purchase:
                        </label>
                        <input
                            type="number"
                            id="totalGallons"
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                            value={totalGallonsToPurchase}
                            onChange={(e) => setTotalGallonsToPurchase(parseFloat(e.target.value))}
                            min="1"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="gasStations" className="block text-gray-700 text-sm font-bold mb-2">
                            Gas Stations (one per line):
                        </label>
                        <textarea
                            id="gasStations"
                            rows="5"
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                            value={gasStationsInput}
                            onChange={(e) => setGasStationsInput(e.target.value)}
                            placeholder="e.g., Shell, 123 Main St"
                        ></textarea>
                    </div>
                </div>

                {errorMessage && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> {errorMessage}</span>
                    </div>
                )}

                <div className="text-center mb-8">
                    <button
                        onClick={generateLog}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 shadow-md"
                    >
                        Generate Fuel Log
                    </button>
                </div>

                {/* Display Table */}
                {purchaseLog.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
                            <thead className="bg-blue-600 text-white">
                                <tr>
                                    <th className="py-3 px-4 text-left rounded-tl-lg">Date</th>
                                    <th className="py-3 px-4 text-left">Gallons Purchased</th>
                                    <th className="py-3 px-4 text-left rounded-tr-lg">Gas Station</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchaseLog.map((purchase, index) => (
                                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="py-3 px-4">{purchase.date}</td>
                                        <td className="py-3 px-4">{purchase.gallons.toFixed(1)}</td>
                                        <td className="py-3 px-4">{purchase.station}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-blue-500 text-white font-bold">
                                <tr>
                                    <td className="py-3 px-4 rounded-bl-lg">Total Gallons:</td>
                                    <td className="py-3 px-4">{totalGallonsInLog.toFixed(1)}</td>
                                    <td className="py-3 px-4 rounded-br-lg"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
