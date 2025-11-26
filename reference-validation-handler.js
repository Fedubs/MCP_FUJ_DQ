// Add this near the end of the get-issues endpoint, after the 'commas' handler

        } else if (actionType === 'reference-validation') {
            // ServiceNow Reference Data Validation
            const credentials = req.app.locals.serviceNowCredentials;
            const config = req.app.locals.phase3Configuration;
            
            if (!credentials) {
                return res.json({
                    success: false,
                    error: 'No ServiceNow credentials found. Please connect in Phase 1.'
                });
            }
            
            // Find column configuration to get ServiceNow table
            const columnConfig = config.columns.find(col => col.name === columnName);
            if (!columnConfig || !columnConfig.serviceNowTable) {
                return res.json({
                    success: false,
                    error: 'No ServiceNow table configured for this column.'
                });
            }
            
            const snowTable = columnConfig.serviceNowTable;
            console.log(`Validating against ServiceNow table: ${snowTable}`);
            
            try {
                const axios = (await import('axios')).default;
                const baseUrl = `https://${credentials.instance}`;
                
                // Fetch all records from ServiceNow table (limit to 1000 for performance)
                console.log(`Fetching records from ${snowTable}...`);
                const response = await axios.get(`${baseUrl}/api/now/table/${snowTable}`, {
                    params: {
                        sysparm_limit: 1000,
                        sysparm_fields: 'name,sys_id'
                    },
                    auth: {
                        username: credentials.username,
                        password: credentials.password
                    },
                    timeout: 30000,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.data || !response.data.result) {
                    throw new Error('Invalid response from ServiceNow');
                }
                
                const snowRecords = response.data.result;
                console.log(`Fetched ${snowRecords.length} records from ServiceNow`);
                
                // Build a map of valid values (case-insensitive)
                const validValues = new Map();
                snowRecords.forEach(record => {
                    const name = String(record.name || '').trim();
                    if (name) {
                        validValues.set(name.toLowerCase(), name);
                    }
                });
                
                console.log(`Valid values count: ${validValues.size}`);
                
                // Check each value in the Excel column
                columnData.forEach((value, index) => {
                    if (!value || value === '') return; // Skip empty values
                    
                    const excelValue = String(value).trim();
                    const excelValueLower = excelValue.toLowerCase();
                    
                    // Exact match (case-insensitive)
                    if (validValues.has(excelValueLower)) {
                        // Value exists - no issue
                        return;
                    }
                    
                    // Value NOT found - check for similar matches
                    let similarMatches = [];
                    for (const [snowValueLower, snowValue] of validValues.entries()) {
                        if (isSimilar(excelValueLower, snowValueLower, 3)) {
                            similarMatches.push(snowValue);
                        }
                    }
                    
                    // Build issue
                    if (similarMatches.length > 0) {
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: excelValue,
                            suggestedFix: similarMatches[0],
                            reason: `Not found in ServiceNow. Similar: ${similarMatches.slice(0, 3).join(', ')}`
                        });
                    } else {
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: excelValue,
                            suggestedFix: 'MANUAL_CHECK_REQUIRED',
                            reason: 'Not found in ServiceNow and no similar matches'
                        });
                    }
                });
                
                console.log(`Found ${issues.length} reference validation issues`);
                
            } catch (snowError) {
                console.error('ServiceNow API error:', snowError.message);
                return res.json({
                    success: false,
                    error: `ServiceNow API error: ${snowError.message}`
                });
            }
        }
