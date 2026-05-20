from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .models import Label


@login_required
def labels(request):
	if request.method == 'POST':
		title = request.POST.get('title', '').strip()
		if not title:
			messages.error(request, 'Label title is required')
			return redirect('labels')

		Label.objects.create(title=title, created_by=request.user)
		messages.success(request, 'Label created')
		return redirect('labels')

	all_labels = Label.objects.filter(created_by=request.user).order_by('-created_at')
	return render(request, 'label/labels.html', {'labels': all_labels})
