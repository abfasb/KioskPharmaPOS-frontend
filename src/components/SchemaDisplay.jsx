import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SchemaDisplay = () => {
    const [schema, setSchema] = useState([]);

    useEffect(() => {
        const fetchSchema = async () => {
            try {
                const response = await axios.get('http://localhost:5000/get-collection');
                setSchema(response.data);
            } catch (error) {
                console.error("Error fetching schema:", error);
            }
        };

        fetchSchema();
    }, []);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-4xl font-bold mb-8 text-center text-green-700">Pharma Kiosk Database Design</h1>
            <div className="flex flex-wrap justify-center gap-10">
                {schema.map((collection, index) => (
                    <div key={collection.name} className="relative w-80 bg-white shadow-lg p-6 rounded-lg border-2 border-green-200 mb-6">
                        <h2 className="text-2xl font-semibold text-green-600 mb-4">{collection.name}</h2>
                        
                        <div>
                            <h3 className="font-semibold text-lg">Attributes:</h3>
                            <ul className="list-disc list-inside ml-4">
                                {collection.attributes.map(attr => (
                                    <li key={attr.name} className="text-sm text-gray-700">
                                        {attr.name} <span className="text-gray-500">({attr.type})</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        {collection.subcollections.length > 0 && (
                            <div className="mt-6">
                                <h3 className="font-semibold text-lg">Subcollections:</h3>
                                <div className="space-y-4">
                                    {collection.subcollections.map((sub, subIndex) => (
                                        <div key={sub} className="relative">
                                            <span className="text-green-500">{sub}</span>
                                            
                                            <div className={`absolute top-1/2 left-0 w-1/2 h-px bg-gray-300 transform -translate-y-1/2 ${subIndex !== collection.subcollections.length - 1 ? 'border-b-2' : ''}`}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SchemaDisplay;
