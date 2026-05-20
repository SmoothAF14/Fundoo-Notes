from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from .models import Note
from label.models import Label

@login_required
def dashboard(request):
    notes = Note.objects.filter(created_by=request.user).prefetch_related('labels')
    return render(request, 'notes/dashboard.html', {'notes': notes})

#Create Note
@login_required
def create_note(request):
    if request.method == "POST":
        title = request.POST['title']
        content = request.POST['content']

        selected_labels = request.POST.getlist('labels')

        note = Note.objects.create(
            created_by=request.user,
            title=title,
            content=content
        )

        if selected_labels:
            note.labels.set(selected_labels)

        return redirect('dashboard')

    labels = Label.objects.filter(created_by=request.user).order_by('-created_at')
    return render(request, 'notes/create_note.html', {'labels': labels})

#Update Note
@login_required
def update_note(request, id):
    note = get_object_or_404(Note, id=id, created_by=request.user)

    if request.method == "POST":
        note.title = request.POST['title']
        note.content = request.POST['content']
        note.save()

        selected_labels = request.POST.getlist('labels')
        note.labels.set(selected_labels)

        return redirect('dashboard')

    labels = Label.objects.filter(created_by=request.user).order_by('-created_at')
    selected_label_ids = [str(x) for x in note.labels.values_list('label_id', flat=True)]
    return render(
        request,
        'notes/update_note.html',
        {'note': note, 'labels': labels, 'selected_label_ids': selected_label_ids},
    )

#Delete Note
@login_required
def delete_note(request, id):
    note = get_object_or_404(Note, id=id, created_by=request.user)
    if request.method == 'POST':
        note.delete()
    return redirect('dashboard')
