

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('notes', '0002_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='note',
            old_name='label',
            new_name='title',
        ),
        migrations.RenameField(
            model_name='note',
            old_name='label_id',
            new_name='title_id',
        ),
    ]
