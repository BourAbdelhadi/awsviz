function debounce(func, delay) {
    let debounceTimer;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

function translatePolicyStatement(statement) {
    const effect = statement.Effect === "Allow"
        ? "<strong style='color: green;'>is allowed to</strong>"
        : "<strong style='color: red;'>is denied from</strong>";
    const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
    const resources = Array.isArray(statement.Resource) ? statement.Resource : [statement.Resource];

    const actionDescriptions = actions.map(action => {
        const parts = action.split(':');
        if (parts.length === 2) {
            const service = parts[0];
            let operation = parts[1];

            // Handle wildcards
            if (operation === '*') {
                operation = '<strong>perform any action</strong>';
            } else if (operation.endsWith('*')) {
                operation = `perform <strong>any action</strong> starting with ${operation.slice(0, -1)}`;
            } else {
                operation = `perform ${operation.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
            }

            return `${operation} in ${service}`;
        }
        return action;
    });

    // Remove any duplicate action descriptions
    const uniqueActionDescriptions = [...new Set(actionDescriptions)];

    // Handle resource descriptions
    const resourceDescriptions = resources.map(resource => resource === '*' ? 'all resources' : resource).join(", ");

    return `The user ${effect}:\n<ul>${uniqueActionDescriptions.map(desc => `<li>${desc}</li>`).join("")}</ul>on ${resourceDescriptions}.`;
}



const serviceIcons = {
    's3': 'https://icon.icepanel.io/AWS/svg/Storage/Simple-Storage-Service.svg',
    'ec2': 'https://icon.icepanel.io/AWS/svg/Compute/EC2.svg',
    'lambda': 'https://icon.icepanel.io/AWS/svg/Compute/Lambda.svg',
    'dynamodb': 'https://icon.icepanel.io/AWS/svg/Database/DynamoDB.svg',
    'rds': 'https://icon.icepanel.io/AWS/svg/Database/RDS.svg',
    'sns': 'https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Notification-Service.svg',
    'sqs': 'https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Queue-Service.svg',
    'iam': 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/IAM-Identity-Center.svg',
    'cloudwatch': 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudWatch.svg',
    'cloudformation': 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudFormation.svg'
};

function getServiceLogo(action) {
    for (const [service, icon] of Object.entries(serviceIcons)) {
        if (action.startsWith(service + ":")) {
            return icon;
        }
    }
    return null;
}

function getResourceLogo(resource) {
    for (const [service, icon] of Object.entries(serviceIcons)) {
        if (resource.includes(service)) {
            return icon;
        }
    }
    return null;
}

let i = 0;
let duration = 750;


function visualizePolicy() {
    const policyInput = document.getElementById('policy-input').value;
    const tableBody = document.getElementById('policy-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear previous table rows

    if (!policyInput.trim()) {
        // Clear visualization and table if input is empty
        document.getElementById('visualization').innerHTML = '';
        document.getElementById('right-pane').style.display = 'none';
        document.getElementById('table-pane').style.display = 'none';
        return;
    }

    try {
        const policy = JSON.parse(policyInput);

        // Check if the policy is a valid IAM policy JSON
        if (!policy || !policy.Statement || !Array.isArray(policy.Statement)) {
            throw new Error('Invalid IAM policy JSON');
        }

        const root = {
            name: "IAM Policy",
            children: []
        };

        policy.Statement.forEach((statement, index) => {
            const statementNode = {
                name: `Statement ${index + 1}: ${statement.Effect}`,
                type: "statement",
                effect: statement.Effect,
                children: []
            };

            const description = translatePolicyStatement(statement);
            const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
            const resources = Array.isArray(statement.Resource) ? statement.Resource : [statement.Resource];

            actions.forEach((action, actionIndex) => {
                resources.forEach((resource, resourceIndex) => {
                    const row = tableBody.insertRow();
                    row.classList.add('action-row'); // Add class for action rows
                    row.insertCell(0).textContent = `Statement ${index + 1}`;
                    row.insertCell(1).textContent = action;
                    row.insertCell(2).textContent = resource;
                    row.insertCell(3).textContent = statement.Effect;
                    const statusCell = row.insertCell(4);
                    const select = document.createElement('select');
                    const optionBlank = document.createElement('option');
                    optionBlank.value = '';
                    optionBlank.textContent = 'Select status';
                    const optionNeeded = document.createElement('option');
                    optionNeeded.value = 'needed';
                    optionNeeded.textContent = 'Needed';
                    const optionNotNeeded = document.createElement('option');
                    optionNotNeeded.value = 'not-needed';
                    optionNotNeeded.textContent = 'Not Needed';
                    select.appendChild(optionBlank);
                    select.appendChild(optionNeeded);
                    select.appendChild(optionNotNeeded);
                    select.addEventListener('change', () => {
                        if (select.value === 'needed') {
                            row.querySelectorAll('td:not(.description-cell)').forEach(cell => {
                                cell.classList.add('needed');
                                cell.classList.remove('not-needed');
                            });
                        } else if (select.value === 'not-needed') {
                            row.querySelectorAll('td:not(.description-cell)').forEach(cell => {
                                cell.classList.add('not-needed');
                                cell.classList.remove('needed');
                            });
                        } else {
                            row.querySelectorAll('td:not(.description-cell)').forEach(cell => {
                                cell.classList.remove('needed', 'not-needed');
                            });
                        }
                    });
                    statusCell.appendChild(select);

                    if (actionIndex === 0 && resourceIndex === 0) {
                        const descriptionCell = row.insertCell(5);
                        descriptionCell.innerHTML = description; // Add description cell
                        descriptionCell.rowSpan = actions.length * resources.length; // Span the description cell across all action rows
                        descriptionCell.classList.add('description-cell'); // Add class for description cell
                    }
                });
            });

            if (statement.Action) {
                const actionsNode = {
                    name: "Actions",
                    children: actions.map(action => ({ name: action, type: "action", logo: getServiceLogo(action) }))
                };
                statementNode.children.push(actionsNode);
            }

            if (statement.Resource) {
                const resourcesNode = {
                    name: "Resources",
                    children: resources.map(resource => ({ name: resource, type: "resource", logo: getResourceLogo(resource) }))
                };
                statementNode.children.push(resourcesNode);
            }

            if (statement.Condition) {
                const conditions = Object.entries(statement.Condition).map(([key, value]) => ({
                    name: `${key}: ${JSON.stringify(value)}`,
                    type: "condition"
                }));
                const conditionsNode = {
                    name: "Conditions",
                    children: conditions
                };
                statementNode.children.push(conditionsNode);
            }

            root.children.push(statementNode);
        });

        // Show the hidden elements
        document.getElementById('right-pane').style.display = 'block';
        document.getElementById('table-pane').style.display = 'block';

        renderTree(root);
    } catch (error) {
        if (policyInput.trim()) {
            alert('Invalid JSON. Please ensure it is a valid IAM policy JSON.');
        }
    }
}



function renderTree(root) {
    const width = document.getElementById('right-pane').clientWidth;
    const height = document.getElementById('visualization').clientHeight;

    const svg = d3.select("#visualization").html("")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", function (event) {
            svg.attr("transform", event.transform);
        }))
        .append("g")
        .attr("transform", `translate(${width / 4}, ${height / 20})`);

    const treeLayout = d3.tree().size([height, width - 160]);
    const rootD3 = d3.hierarchy(root, d => d.children);
    rootD3.x0 = height / 2;
    rootD3.y0 = 0;

    update(rootD3);

    function update(source) {
        const treeData = treeLayout(rootD3);
        const nodes = treeData.descendants();
        const links = treeData.descendants().slice(1);

        nodes.forEach(d => { d.y = d.depth * 180 });

        const node = svg.selectAll('g.node')
            .data(nodes, d => d.id || (d.id = ++i));

        const nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr("transform", d => `translate(${source.y0},${source.x0})`)
            .on('click', click)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        nodeEnter.append('circle')
            .attr('class', 'node')
            .attr('r', 1e-6)
            .style("fill", d => {
                if (d.data.type === "statement") {
                    return d.data.effect === "Allow" ? "green" : (d.data.effect === "Deny" ? "red" : "#fff");
                } else {
                    return "#fff";
                }
            })
            .attr("stroke", d => d.data.effect === "Allow" ? "green" : (d.data.effect === "Deny" ? "red" : "steelblue"));

        nodeEnter.append('text')
            .attr("dy", ".35em")
            .attr("x", d => d.children || d._children ? -13 : 13)
            .attr("text-anchor", d => d.children || d._children ? "end" : "start")
            .text(d => d.data.name);

        nodeEnter.filter(d => d.data.logo).append("image")
            .attr("xlink:href", d => d.data.logo)
            .attr("x", -12)
            .attr("y", -12)
            .attr("width", 24)
            .attr("height", 24);

        nodeEnter.append("title")
            .text(d => `${d.data.name}\nType: ${d.data.type}\nEffect: ${d.data.effect || "N/A"}\n${d.data.type === "condition" ? "Condition: " + d.data.name : ""}`);

        const nodeUpdate = nodeEnter.merge(node);

        nodeUpdate.transition()
            .duration(duration)
            .attr("transform", d => `translate(${d.y},${d.x})`);

        nodeUpdate.select('circle.node')
            .attr('r', 10)
            .style("fill", d => {
                if (d.data.type === "statement") {
                    return d.data.effect === "Allow" ? "green" : (d.data.effect === "Deny" ? "red" : "#fff");
                } else {
                    return "#fff";
                }
            })
            .attr('cursor', 'pointer');

        const nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", d => `translate(${source.y},${source.x})`)
            .remove();

        nodeExit.select('circle')
            .attr('r', 1e-6);

        nodeExit.select('text')
            .style('fill-opacity', 1e-6);

        const link = svg.selectAll('path.link')
            .data(links, d => d.id);

        const linkEnter = link.enter().insert('path', "g")
            .attr("class", "link")
            .attr('d', d => {
                const o = { x: source.x0, y: source.y0 };
                return diagonal(o, o);
            });

        const linkUpdate = linkEnter.merge(link);

        linkUpdate.transition()
            .duration(duration)
            .attr('d', d => diagonal(d, d.parent));

        const linkExit = link.exit().transition()
            .duration(duration)
            .attr('d', d => {
                const o = { x: source.x, y: source.y };
                return diagonal(o, o);
            })
            .remove();

        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        function diagonal(s, d) {
            const path = `M ${s.y} ${s.x}
                          C ${(s.y + d.y) / 2} ${s.x},
                            ${(s.y + d.y) / 2} ${d.x},
                            ${d.y} ${d.x}`;
            return path;
        }

        function click(event, d) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }
            update(d);
        }
    }

    function dragstarted(event, d) {
        if (!event.active) {
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
    }

    function dragged(event, d) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
        update(event.subject);
    }

    function dragended(event, d) {
        if (!event.active) {
            event.subject.fx = null;
            event.subject.fy = null;
        }
    }

    update(rootD3);
}


// Hardcoded policy for the "Test Me" button
const hardcodedPolicy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "ec2:StartInstances",
                "lambda:InvokeFunction"
            ],
            "Resource": "*",
        },
        {
            "Effect": "Deny",
            "Action": [
                "s3:DeleteObject",
                "ec2:TerminateInstances",
                "lambda:DeleteFunction",
                "cloudformation:DeleteStack"
            ],
            "Resource": "*",
        }
    ]
};

function testPolicy() {
    document.getElementById('policy-input').value = JSON.stringify(hardcodedPolicy, null, 2);
    visualizePolicy();
}

// Add event listener to update visualization and table on textarea input
document.getElementById('policy-input').addEventListener('input', debounce(visualizePolicy, 500));


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    document.getElementById('policy-input').addEventListener('input', handleTextareaChange);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    window.addEventListener('click', outsideClick);
    window.addEventListener('keydown', keyPress);
});
let allFiles = [];
let zipInstance = null;
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.zip')) {
        zipInstance = await JSZip.loadAsync(file);
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        document.getElementById('fileTree').style.display = 'block';
        allFiles = Object.keys(zipInstance.files).filter(filename => filename.endsWith('.json'));
        displayFiles(allFiles);
    } else {
        alert('Please upload a valid zip file.');
    }
}
function displayFiles(files) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    files.forEach(filename => {
        const li = document.createElement('li');
        li.textContent = filename;
        li.addEventListener('click', async () => {
            const fileContent = await zipInstance.file(filename).async('text');
            document.getElementById('policy-input').value = fileContent;
            // Update visualization and table
            const policyJson = JSON.parse(fileContent);
            visualizePolicy(policyJson);
            populatePolicyTable(policyJson);
            // Highlight selected file
            document.querySelectorAll('#fileList li').forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');
        });
        fileList.appendChild(li);
    });
}
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredFiles = allFiles.filter(filename => filename.toLowerCase().includes(searchTerm));
    displayFiles(filteredFiles);
}
function handleTextareaChange() {
    const fileContent = document.getElementById('policy-input').value;
    try {
        const policyJson = JSON.parse(fileContent);
        visualizePolicy(policyJson);
        populatePolicyTable(policyJson);
    } catch (e) {
        console.error("Invalid JSON");
    }
}
// Modal functions
function openModal() {
    document.getElementById('instructionModal').style.display = 'block';
}
function closeModal() {
    document.getElementById('instructionModal').style.display = 'none';
}
function outsideClick(event) {
    if (event.target == document.getElementById('instructionModal')) {
        closeModal();
    }
}
function keyPress(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
}