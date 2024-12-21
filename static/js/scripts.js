document.addEventListener('DOMContentLoaded', () => {
    const board = document.querySelector('.board');
    const initialList = document.querySelector('.initial-list');
    const boardNameInput = document.querySelector('#boardName');

    let draggedCard = null;

    function addCardEvents(card) {
        card.addEventListener('dragstart', () => {
            draggedCard = card;
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            draggedCard = null;
            card.classList.remove('dragging');
        });
    }

    function addColumnEvents(column) {
        const header = column.querySelector('h2');
        header.addEventListener('dblclick', () => {
            column.remove();
        });

        header.addEventListener('blur', () => {
            if (header.textContent.trim() === '') {
                header.textContent = 'Untitled Section';
            }
        });

        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingCard = document.querySelector('.dragging');
            const afterElement = getDragAfterElement(column, e.clientY);
            if (afterElement == null) {
                column.appendChild(draggingCard);
            } else {
                column.insertBefore(draggingCard, afterElement);
            }
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [
            ...container.querySelectorAll('.card:not(.dragging)')
        ];

        return draggableElements.reduce(
            (closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            },
            { offset: Number.NEGATIVE_INFINITY }
        ).element;
    }

    document.querySelector('#generateButton').addEventListener('click', async () => {
        const playlistUrl = document.querySelector('#playlistUrl').value;

        const response = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistUrl })
        });

        const data = await response.json();
        if (data.error) {
            alert(data.error);
            return;
        }

        initialList.innerHTML = '';
        data.videos.forEach(video => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.draggable = true;
            card.innerHTML = `
                <img src="${video.thumbnail}" alt="${video.title}">
                <div><a href="${video.url}" target="_blank">${video.title}</a></div>
            `;
            addCardEvents(card);
            initialList.appendChild(card);
        });
    });

    document.querySelector('#addColumn').addEventListener('click', () => {
        const newColumn = document.createElement('div');
        newColumn.classList.add('column');
        newColumn.innerHTML = '<h2 contenteditable="true">New Section</h2>';
        board.appendChild(newColumn);
        addColumnEvents(newColumn);
    });

    document.querySelector('#exportData').addEventListener('click', () => {
        const data = {
            boardName: boardNameInput.value.trim() || 'Untitled Board',
            sections: Array.from(document.querySelectorAll('.column')).map(column => {
                return {
                    title: column.querySelector('h2').textContent.trim(),
                    cards: Array.from(column.querySelectorAll('.card')).map(card => {
                        return {
                            thumbnail: card.querySelector('img').src,
                            title: card.querySelector('a').textContent.trim(),
                            url: card.querySelector('a').href
                        };
                    })
                };
            })
        };
        const dataStr = JSON.stringify(data);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.boardName.replace(/[^a-z0-9]/gi, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    document.querySelector('#importData').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.addEventListener('change', () => {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const data = JSON.parse(e.target.result);
                    boardNameInput.value = data.boardName || 'Untitled Board';
                    board.innerHTML = '';
                    data.sections.forEach(section => {
                        const column = document.createElement('div');
                        column.classList.add('column');
                        column.innerHTML = `<h2 contenteditable="true">${section.title}</h2>`;
                        section.cards.forEach(cardData => {
                            const card = document.createElement('div');
                            card.classList.add('card');
                            card.draggable = true;
                            card.innerHTML = `
                                <img src="${cardData.thumbnail}" alt="${cardData.title}">
                                <div><a href="${cardData.url}" target="_blank">${cardData.title}</a></div>
                            `;
                            addCardEvents(card);
                            column.appendChild(card);
                        });
                        board.appendChild(column);
                        addColumnEvents(column);
                    });
                };
                reader.readAsText(file);
            }
        });
        input.click();
    });

    document.querySelectorAll('.card').forEach(addCardEvents);
    document.querySelectorAll('.column').forEach(addColumnEvents);
});